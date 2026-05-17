import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Paper, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconArrowLeft, IconArrowRight, IconArrowsMaximize } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Socket } from 'socket.io-client';
import { ExamTakeHeader } from '@/components/ExamTake/ExamTakeHeader';
import { ExamQuestionPanel } from '@/components/ExamTake/ExamQuestionPanel';
import { QuestionNavigator } from '@/components/ExamTake/QuestionNavigator';
import { isQuestionAnswered } from '@/components/ExamTake/isQuestionAnswered';
import type { MockExamQuestion } from '@/components/ExamTake/types';
import appConfig from '@/configs/app.config';
import examApi, {
  type Question as ApiQuestion,
  type StartSessionData,
  type SubmitResult,
} from '@/services/examApi';
import { useExamTakeState } from '@/hooks/useExamTakeState';
import useAuth from '@/hooks/useAuth';
import {
  flushAutosaveQueue,
  queueAutosave,
  saveDraftAnswers,
} from '@/services/examAutosaveClient';
import { flushIntegrityQueue, trackIntegrityEvent } from '@/services/examIntegrityClient';
import { createExamRealtimeSocket, type ForceSubmitPayload, type ViolationConfirmedPayload } from '@/services/examRealtimeSocket';
import classes from '@/components/ExamTake/ExamTake.module.scss';

function formatHms(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
}

function toUiQuestion(question: ApiQuestion, number: number): MockExamQuestion {
  const media_url = question.media_url?.trim() ? question.media_url : null;

  if (question.question_type === 'essay') {
    return {
      number,
      points: question.points,
      type: 'essay',
      prompt: question.content,
      media_url,
      essay: {
        placeholder: 'Nhap cau tra loi cua ban...',
      },
    };
  }

  const options = Object.entries(question.options ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rawLabel]) => {
      let label = '';
      if (typeof rawLabel === 'string') {
        label = rawLabel;
      } else if (rawLabel && typeof rawLabel === 'object') {
        const nested = (rawLabel as Record<string, unknown>)[key];
        label = typeof nested === 'string' ? nested : JSON.stringify(rawLabel);
      } else if (rawLabel != null) {
        label = String(rawLabel);
      }
      return { key, label };
    });

  return {
    number,
    points: question.points,
    type: 'mcq',
    prompt: question.content,
    media_url,
    options,
  };
}

/** Câu hỏi từ startSession — đúng mã đề (D01/D02), đã xáo thứ tự/đáp án */
function mapSessionQuestionsToUi(questionData: StartSessionData['questions']): {
  questions: MockExamQuestion[];
  idMap: Record<number, string>;
} {
  const mappedQuestions = questionData.map((q, idx) =>
    toUiQuestion(
      {
        id: q.id,
        exam_id: '',
        content: q.content,
        question_type: q.question_type,
        options: q.options,
        points: q.points,
        media_url: q.media_url ?? null,
        created_at: '',
      },
      idx + 1
    )
  );
  const idMap: Record<number, string> = {};
  for (let i = 0; i < questionData.length; i += 1) {
    idMap[i + 1] = questionData[i].id;
  }
  return { questions: mappedQuestions, idMap };
}

type RealtimeHandlers = NonNullable<Parameters<typeof createExamRealtimeSocket>[0]['handlers']>;

function buildSubmitAnswers(
  answers: Record<string, string>,
  questionIdByNumber: Record<number, string>,
  questionByNumber: Map<number, MockExamQuestion>,
): Record<string, string | string[]> {
  // Key by display index (0,1,2...) so BE can unshuffle using question_order
  const payload: Record<string, string | string[]> = {};

  for (const [rawNumber, questionId] of Object.entries(questionIdByNumber)) {
    const number = Number(rawNumber);
    const displayIdx = String(number - 1); // 0-based display index
    const question = questionByNumber.get(number);
    if (!question) continue;

    const answerKey = `q${number}`;
    const rawAnswer = answers[answerKey];

    if (question.type === 'essay') {
      const essay = rawAnswer?.trim();
      if (essay) payload[displayIdx] = essay;
      continue;
    }

    if (question.type === 'mcq' && rawAnswer) {
      payload[displayIdx] = rawAnswer;
    }
  }

  return payload;
}

// P0 Fix: SessionStorage keys for violation persistence
const VIOLATION_STORAGE_KEY = (examId: string) => `exam_violation_${examId}`;

type ViolationStorageData = {
  reason: string;
  sessionId: string;
  at: number;
  violationType: string;
  serverConfirmed: boolean;
};

function saveViolationToStorage(examId: string, data: ViolationStorageData): void {
  try {
    sessionStorage.setItem(VIOLATION_STORAGE_KEY(examId), JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

function loadViolationFromStorage(examId: string): ViolationStorageData | null {
  try {
    const raw = sessionStorage.getItem(VIOLATION_STORAGE_KEY(examId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ViolationStorageData;
    // Only restore if violation was recent (within 30 seconds)
    if (Date.now() - parsed.at > 30000) {
      sessionStorage.removeItem(VIOLATION_STORAGE_KEY(examId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearViolationStorage(examId: string): void {
  try {
    sessionStorage.removeItem(VIOLATION_STORAGE_KEY(examId));
  } catch {
    // Ignore
  }
}

const ExamTake = () => {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const activeExamId = examId ?? 'preview-exam';
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [fullscreenError, setFullscreenError] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);
  const [fsRevision, setFsRevision] = useState(0);
  /** GV đã bật thi (socket) — có thể trước khi startSession API xong */
  const [teacherRuntimeLive, setTeacherRuntimeLive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const teacherFullscreenModalRef = useRef(false);
  /** P0 Fix: Grace period timer ref for fullscreen exit */
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** P0 Fix: Flag to indicate violation is being reported to server */
  const reportingViolationRef = useRef(false);
  /** Chỉ dev: production luôn bắt fullscreen (tránh VITE_DISABLE_INTEGRITY trên Vercel). */
  const integrityDisabled =
    import.meta.env.DEV && import.meta.env.VITE_DISABLE_INTEGRITY === 'true';
  const inBrowserFullscreen = Boolean(document.fullscreenElement);

  const placeholderQuestion = (n: number): MockExamQuestion => ({
    number: n,
    points: 1,
    type: 'mcq',
    prompt: t('exam_take.placeholder_prompt', { number: n }),
    options: [
      { key: 'A', label: t('exam_take.option_label', { letter: 'A' }) },
      { key: 'B', label: t('exam_take.option_label', { letter: 'B' }) },
      { key: 'C', label: t('exam_take.option_label', { letter: 'C' }) },
      { key: 'D', label: t('exam_take.option_label', { letter: 'D' }) },
    ],
  });

  const {
    examData: {
      questions,
      setQuestions,
      questionIdByNumber,
      setQuestionIdByNumber,
      examTitle,
      setExamTitle,
      examSection,
      setExamSection,
      answers,
      setAnswers,
      flagged,
      setFlagged,
      navFilter,
      setNavFilter,
      currentNumber,
      setCurrentNumber,
    },
    boot: { sessionId, setSessionId, bootLoading, setBootLoading, bootError, setBootError, versionCode, setVersionCode, deadlineAt, setDeadlineAt },
    runtime: {
      remainingSeconds,
      setRemainingSeconds,
      examStarted,
      setExamStarted,
      realtimeMessage,
      setRealtimeMessage,
      isFullscreen,
      setIsFullscreen,
      focusLeaveCount,
      setFocusLeaveCount,
      connectionStatus,
      setConnectionStatus,
      syncServerTime,
    },
    submit: {
      autoSubmitCountdown,
      setAutoSubmitCountdown,
      autoSubmitted,
      setAutoSubmitted,
      submitting,
      setSubmitting,
      submitFailed,
      setSubmitFailed,
      serverForceSummaryText,
      setServerForceSummaryText,
    },
    integrity: { violationLocked, setViolationLocked, lockReason, setLockReason },
    refs: { remainingRef, sessionStartingRef, violationTriggeredRef, lastViolationAtRef },
  } = useExamTakeState(activeExamId);

  const byNumber = useMemo(() => new Map(questions.map((q) => [q.number, q])), [questions]);
  const resolveQuestion = (n: number): MockExamQuestion => byNumber.get(n) ?? placeholderQuestion(n);
  const total = questions.length;
  const maxQuestionIndex = Math.max(total, 1);

  const applyServerForceSubmit = useCallback(
    (payload?: ForceSubmitPayload) => {
      const serverMessage = payload?.message?.trim() || 'He thong da tu dong nop bai tren server.';

      const summary = payload?.summary;
      if (summary) {
        setServerForceSummaryText(
          `Tong phien active: ${summary.active_sessions}. Da nop: ${summary.submitted_sessions}. Loi: ${summary.failed_sessions}.`
        );
      } else {
        setServerForceSummaryText('');
      }

      setRealtimeMessage(serverMessage);
      setExamStarted(false);
      setSubmitting(false);
      setSubmitFailed(false);
      setViolationLocked(false);
      setAutoSubmitted(true);

      void flushAutosaveQueue(activeExamId);
      void flushIntegrityQueue(activeExamId);
    },
    [activeExamId]
  );

  const submitCurrentSession = useCallback(
    async (source: 'manual' | 'auto') => {
      if (autoSubmitted || submitting) return;
      if (!sessionId) {
        setSubmitFailed(false);
        setRealtimeMessage('He thong dang khoi tao phien thi. Vui long thu lai sau vai giay.');
        return;
      }

      setSubmitting(true);
      setSubmitFailed(false);

      try {
        await flushAutosaveQueue(activeExamId);
        await flushIntegrityQueue(activeExamId);

        const payload = buildSubmitAnswers(answers, questionIdByNumber, byNumber);
        const result = await examApi.submitSession(sessionId, payload);
        setSubmitResult(result);

        setRealtimeMessage(
          source === 'auto'
            ? 'He thong da nop bai tu dong thanh cong.'
            : 'Nop bai thanh cong.'
        );
        setServerForceSummaryText('');
      } catch (error: unknown) {
        type ErrorWithStatus = { response?: { status?: number } };
        const responseStatus = (error as ErrorWithStatus)?.response?.status;
        if (source === 'auto' && (responseStatus === 400 || responseStatus === 409)) {
          setSubmitFailed(false);
          setRealtimeMessage('Phien thi da duoc he thong ket thuc va nop bai tren server.');
          setServerForceSummaryText('');
        } else {
          setSubmitFailed(true);
          setRealtimeMessage('Khong the nop bai len server. Vui long lien he giam thi.');
          setServerForceSummaryText('');
        }
      } finally {
        setSubmitting(false);
        setAutoSubmitted(true);
        setViolationLocked(false);
      }
    },
    [
      activeExamId,
      answers,
      autoSubmitted,
      byNumber,
      questionIdByNumber,
      sessionId,
      submitting,
    ]
  );

  const ensureSessionStarted = useCallback(async () => {
    if (!examId || sessionStartingRef.current) return;
    if (sessionId && questions.length > 0) {
      setExamStarted(true);
      return;
    }
    sessionStartingRef.current = true;
    setSessionLoading(true);
    try {
      const startData = await examApi.startSession(activeExamId);
      if (!startData.questions?.length) {
        throw new Error('Khong co cau hoi cho ma de nay');
      }

      const { questions: sessionQuestions, idMap } = mapSessionQuestionsToUi(startData.questions);
      setQuestions(sessionQuestions);
      setQuestionIdByNumber(idMap);
      setCurrentNumber(1);
      setSessionId(startData.session.id);
      setVersionCode(startData.version_code ?? null);

      const classEndsAt =
        startData.runtime_state?.is_active && startData.runtime_state.ends_at
          ? startData.runtime_state.ends_at
          : null;
      setDeadlineAt(classEndsAt ?? startData.deadline_at ?? null);
      if (classEndsAt) {
        syncServerTime(Date.now(), classEndsAt);
      }

      setExamStarted(true);
      setBootError('');
    } catch {
      setBootError('Khong the khoi tao phien thi.');
      setExamStarted(false);
    } finally {
      sessionStartingRef.current = false;
      setSessionLoading(false);
    }
  }, [
    activeExamId,
    examId,
    examId,
    questions.length,
    sessionId,
    setBootError,
    setCurrentNumber,
    setDeadlineAt,
    setExamStarted,
    setQuestionIdByNumber,
    setQuestions,
    setSessionId,
    setVersionCode,
    syncServerTime,
  ]);

  const requestFullscreen = useCallback(async () => {
    setFullscreenError('');
    const el = document.documentElement;
    const req =
      el.requestFullscreen?.bind(el) ??
      (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
        .webkitRequestFullscreen?.bind(el);
    if (!req) {
      setFullscreenError(t('exam_take.fullscreen_error'));
      void trackIntegrityEvent(activeExamId, 'fullscreen_error', { reason: 'unsupported' });
      return;
    }
    try {
      await req();
    } catch (error) {
      setFullscreenError(t('exam_take.fullscreen_error'));
      void trackIntegrityEvent(activeExamId, 'fullscreen_error', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }, [activeExamId, t]);

  const requestFullscreenRef = useRef(requestFullscreen);
  requestFullscreenRef.current = requestFullscreen;

  const promptTeacherStartedFullscreen = useCallback(() => {
    if (integrityDisabled || document.fullscreenElement) return;
    if (teacherFullscreenModalRef.current) return;
    teacherFullscreenModalRef.current = true;
    const modalId = 'exam-teacher-started-fullscreen';
    modals.open({
      modalId,
      centered: true,
      closeOnClickOutside: false,
      closeOnEscape: false,
      withCloseButton: false,
      title: t('exam_take.exam_started_title'),
      children: (
        <Stack gap="md">
          <Text size="sm">{t('exam_take.exam_started_fullscreen_desc')}</Text>
          <Button
            color="teal"
            size="md"
            leftSection={<IconArrowsMaximize size={18} />}
            onClick={() => {
              void (async () => {
                await requestFullscreenRef.current();
                modals.close(modalId);
              })();
            }}
          >
            {t('exam_take.exam_started_fullscreen_button')}
          </Button>
        </Stack>
      ),
    });
  }, [integrityDisabled, t]);

  const promptTeacherStartedFullscreenRef = useRef(promptTeacherStartedFullscreen);
  promptTeacherStartedFullscreenRef.current = promptTeacherStartedFullscreen;

  const markTeacherRuntimeLive = useCallback(() => {
    setTeacherRuntimeLive(true);
    promptTeacherStartedFullscreenRef.current();
  }, []);

  const forceAutoSubmit = useCallback(() => {
    if (autoSubmitted || submitting) return;
    if (!sessionId) {
      setRealtimeMessage('He thong dang khoi tao phien thi, chua the tu dong nop bai.');
      return;
    }
    void submitCurrentSession('auto');
  }, [autoSubmitted, sessionId, submitting, submitCurrentSession]);

  const handlersRef = useRef<RealtimeHandlers>({});

  handlersRef.current = {
    onState: (payload) => {
      setConnectionStatus('connected');
      if (payload.status === 'started' && payload.endsAt) {
        syncServerTime(payload.serverNowMs ?? Date.now(), payload.endsAt);
        setAutoSubmitted(false);
        setSubmitFailed(false);
        setViolationLocked(false);
        setRealtimeMessage('');
        violationTriggeredRef.current = false;
        markTeacherRuntimeLive();
        void ensureSessionStarted();
      } else if (payload.status === 'not_started') {
        setTeacherRuntimeLive(false);
        teacherFullscreenModalRef.current = false;
        setExamStarted(false);
        setRealtimeMessage('Giang vien chua bat dau bai thi. Vui long cho...');
      } else if (payload.status === 'ended') {
        setTeacherRuntimeLive(false);
        teacherFullscreenModalRef.current = false;
        setExamStarted(false);
        setRealtimeMessage('Bai thi da ket thuc.');
        void forceAutoSubmit();
      }
    },
    onStarted: (payload) => {
      setConnectionStatus('connected');
      syncServerTime(Date.now(), payload.endsAt);
      setAutoSubmitted(false);
      setSubmitFailed(false);
      setViolationLocked(false);
      violationTriggeredRef.current = false;
      setRealtimeMessage('Bai thi da bat dau. Chuc ban lam bai tot.');
      markTeacherRuntimeLive();
      void ensureSessionStarted();
    },
    onFinal15: (payload) => {
      const msg = payload?.message?.trim() || 'Con 15 phut cuoi. Vui long kiem tra va nop bai.';
      setRealtimeMessage(msg);
      modals.open({
        centered: true,
        title: 'Thong bao tu he thong',
        children: <Text size="sm">{msg}</Text>,
      });
    },
    onForceSubmit: (payload) => {
      applyServerForceSubmit(payload);
    },
    onAlert: (payload) => {
      const msg = payload?.message?.trim() || 'Thong bao tu giam thi';
      setRealtimeMessage(msg);
    },
    onError: (message) => {
      setRealtimeMessage(`Realtime loi: ${message}`);
    },
    onDisconnect: () => {
      setConnectionStatus('disconnected');
    },
    onReconnecting: () => {
      setConnectionStatus('reconnecting');
    },
    onConnect: () => {
      setConnectionStatus('connected');
    },
    // P0 Fix: Handle server-confirmed violation
    onViolationConfirmed: (payload: ViolationConfirmedPayload) => {
      // Only process if this is for our session
      if (payload.sessionId !== sessionId) return;

      // Update sessionStorage to mark as server-confirmed
      const existingViolation = loadViolationFromStorage(activeExamId);
      if (existingViolation) {
        saveViolationToStorage(activeExamId, {
          ...existingViolation,
          serverConfirmed: true,
        });
      }

      setRealtimeMessage(payload.message);

      if (payload.autoSubmitTriggered) {
        setAutoSubmitted(true);
        setViolationLocked(false);
        clearViolationStorage(activeExamId);
      } else if (payload.sessionStatus === 'violation_locked') {
        setViolationLocked(true);
      }
    },
  };

  // P0 Fix: Enhanced triggerViolationLock - sends to server immediately
  const triggerViolationLock = useCallback(async (
    reason: string,
    violationType: 'fullscreen_exit' | 'visibility_hidden' | 'window_blur' | 'tab_switch' | 'devtools_open' | 'copy_attempt' | 'paste_attempt' | 'context_menu' | 'other' = 'other'
  ) => {
    const now = Date.now();
    if (now - lastViolationAtRef.current < 1200) return;
    lastViolationAtRef.current = now;
    if (violationTriggeredRef.current || reportingViolationRef.current) return;
    violationTriggeredRef.current = true;
    reportingViolationRef.current = true;

    // Set local state immediately for UI feedback
    setLockReason(reason);
    setAutoSubmitCountdown(5);
    setViolationLocked(true);

    // P0 Fix: Save to sessionStorage immediately (persist across reload)
    if (sessionId) {
      saveViolationToStorage(activeExamId, {
        reason,
        sessionId,
        at: now,
        violationType,
        serverConfirmed: false,
      });
    }

    // P0 Fix: Report violation to server immediately
    if (sessionId) {
      try {
        const result = await examApi.reportViolation(sessionId, {
          violation_type: violationType,
          reason,
          client_at: new Date().toISOString(),
          auto_submit: true, // Request server to auto-submit
        });

        // Update sessionStorage with server confirmation
        saveViolationToStorage(activeExamId, {
          reason,
          sessionId,
          at: now,
          violationType,
          serverConfirmed: true,
        });

        // If server already auto-submitted, update UI accordingly
        if (result.auto_submit_triggered) {
          setRealtimeMessage(result.message);
          setAutoSubmitted(true);
          setViolationLocked(false);
          clearViolationStorage(activeExamId);
        }
      } catch (error) {
        console.error('[violation] Failed to report to server:', error);
        // Keep local violation state — will retry on countdown
        setRealtimeMessage('Không thể gửi báo cáo vi phạm. Đang thử lại...');
      }
    }

    reportingViolationRef.current = false;
  }, [activeExamId, lastViolationAtRef, sessionId, setAutoSubmitCountdown, setAutoSubmitted, setLockReason, setRealtimeMessage, setViolationLocked, violationTriggeredRef]);

  useEffect(() => {
    let canceled = false;

    const bootstrap = async () => {
      if (!examId) {
        setBootError('Khong tim thay ma bai thi.');
        setBootLoading(false);
        return;
      }

      try {
        setBootLoading(true);
        setBootError('');
        const examData = await examApi.getExam(activeExamId);
        if (canceled) return;

        setExamTitle(examData.title || 'Bai thi');
        setExamSection(examData.subject_name || examData.description || '');
        setQuestions([]);
        setQuestionIdByNumber({});
        setSessionId(null);
        setVersionCode(null);
        setCurrentNumber(1);
        setRemainingSeconds(0);
        setExamStarted(false);
        setTeacherRuntimeLive(false);
        teacherFullscreenModalRef.current = false;
      } catch {
        if (canceled) return;
        setBootError('Khong the tai du lieu bai thi hoac khoi tao phien thi.');
      } finally {
        if (!canceled) setBootLoading(false);
      }
    };

    void bootstrap();

    return () => {
      canceled = true;
    };
  }, [activeExamId, examId]);

  useEffect(() => {
    if (currentNumber > maxQuestionIndex) {
      setCurrentNumber(1);
    }
  }, [currentNumber, maxQuestionIndex]);

  // P0 Fix: Restore violation state from sessionStorage on mount/reload
  useEffect(() => {
    if (!sessionId || integrityDisabled) return;

    const savedViolation = loadViolationFromStorage(activeExamId);
    if (!savedViolation) return;

    // Only restore if it's for the same session
    if (savedViolation.sessionId !== sessionId) {
      clearViolationStorage(activeExamId);
      return;
    }

    // Restore violation state
    violationTriggeredRef.current = true;
    setLockReason(savedViolation.reason);
    setViolationLocked(true);

    if (savedViolation.serverConfirmed) {
      // Server already confirmed — just show locked UI and auto-submit
      setRealtimeMessage('Bài thi đã bị khóa do vi phạm trước đó.');
      void submitCurrentSession('auto').then(() => {
        clearViolationStorage(activeExamId);
      });
    } else {
      // Server hasn't confirmed yet — retry reporting
      setRealtimeMessage('Đang xác nhận vi phạm với server...');
      void examApi.reportViolation(sessionId, {
        violation_type: savedViolation.violationType as any,
        reason: savedViolation.reason,
        client_at: new Date(savedViolation.at).toISOString(),
        auto_submit: true,
      }).then((result) => {
        saveViolationToStorage(activeExamId, {
          ...savedViolation,
          serverConfirmed: true,
        });
        if (result.auto_submit_triggered) {
          setAutoSubmitted(true);
          setViolationLocked(false);
          clearViolationStorage(activeExamId);
        }
        setRealtimeMessage(result.message);
      }).catch(() => {
        setRealtimeMessage('Không thể xác nhận vi phạm. Bài thi sẽ bị khóa.');
      });
    }
  }, [activeExamId, integrityDisabled, sessionId, setAutoSubmitted, setLockReason, setRealtimeMessage, setViolationLocked, submitCurrentSession]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!examStarted || autoSubmitted) return;
      setRemainingSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [examStarted, autoSubmitted]);

  // P0 Fix: Fullscreen change with 3-second grace period
  useEffect(() => {
    if (integrityDisabled) return;

    const onFullscreenChange = () => {
      const full = Boolean(document.fullscreenElement);
      setIsFullscreen(full);
      setFsRevision((n) => n + 1);

      if (full) {
        setFullscreenError('');
        modals.close('exam-teacher-started-fullscreen');
        teacherFullscreenModalRef.current = false;

        // P0 Fix: User returned to fullscreen within grace period — cancel violation
        if (graceTimerRef.current) {
          clearTimeout(graceTimerRef.current);
          graceTimerRef.current = null;
          void trackIntegrityEvent(activeExamId, 'fullscreen_enter', { recovered: true });
          setRealtimeMessage('Đã quay lại toàn màn hình kịp thời.');
          // Reset violation flags if not yet triggered
          if (!violationTriggeredRef.current) {
            setViolationLocked(false);
          }
        } else {
          void trackIntegrityEvent(activeExamId, 'fullscreen_enter');
        }
      } else {
        // Exited fullscreen
        if (examStarted || full) {
          void trackIntegrityEvent(activeExamId, 'fullscreen_exit');
        }

        // P0 Fix: Grace period 3s before triggering violation
        if (isFullscreen && examStarted && !autoSubmitted && !violationTriggeredRef.current) {
          setRealtimeMessage('Phát hiện thoát toàn màn hình. Quay lại trong 3 giây để tiếp tục...');

          graceTimerRef.current = setTimeout(() => {
            graceTimerRef.current = null;
            // Only trigger if still not in fullscreen after grace period
            if (!document.fullscreenElement && examStarted && !autoSubmitted) {
              void triggerViolationLock(
                'Phát hiện thoát toàn màn hình. Bài thi sẽ bị khóa và tự động nộp.',
                'fullscreen_exit'
              );
            }
          }, 3000);
        }
      }
    };

    const onFullscreenError = () => {
      setFullscreenError(t('exam_take.fullscreen_error'));
      void trackIntegrityEvent(activeExamId, 'fullscreen_error');
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('fullscreenerror', onFullscreenError);
    onFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('fullscreenerror', onFullscreenError);
      // Clean up grace timer on unmount
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
    };
  }, [activeExamId, autoSubmitted, examStarted, integrityDisabled, isFullscreen, setIsFullscreen, setRealtimeMessage, setViolationLocked, t, triggerViolationLock]);

  useEffect(() => {
    if (integrityDisabled) return;
    const onVisibilityChange = () => {
      if (!examStarted || autoSubmitted) return;
      if (document.hidden) {
        setFocusLeaveCount((v) => v + 1);
        void trackIntegrityEvent(activeExamId, 'visibility_hidden');
        // P0 Fix: Use updated triggerViolationLock with violation type
        void triggerViolationLock('Phát hiện rời khỏi tab thi. Bài thi sẽ bị khóa và tự động nộp.', 'visibility_hidden');
      }
    };
    const onWindowBlur = () => {
      if (!examStarted || autoSubmitted) return;
      setFocusLeaveCount((v) => v + 1);
      void trackIntegrityEvent(activeExamId, 'window_blur');
      // P0 Fix: Use updated triggerViolationLock with violation type
      void triggerViolationLock('Phát hiện mất focus cửa sổ thi. Bài thi sẽ bị khóa và tự động nộp.', 'window_blur');
    };
    const onWindowFocus = () => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'window_focus');
    };
    const onCopy = () => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'copy_attempt');
    };
    const onPaste = () => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'paste_attempt');
    };
    const onContextMenu = (event: MouseEvent) => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'context_menu');
      event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!examStarted || autoSubmitted) return;
      const key = event.key.toUpperCase();
      const isDevtools =
        key === 'F12' ||
        (event.ctrlKey && event.shiftKey && ['I', 'J', 'C'].includes(key)) ||
        (event.metaKey && event.altKey && ['I', 'J', 'C'].includes(key));
      if (!isDevtools) return;
      event.preventDefault();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'before_unload');
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [activeExamId, autoSubmitted, examStarted, integrityDisabled, triggerViolationLock]);
  useEffect(() => {
    if (!examStarted || !sessionId || autoSubmitted) return;
    saveDraftAnswers(activeExamId, answers);
    queueAutosave(activeExamId, answers);
  }, [activeExamId, answers, autoSubmitted, examStarted, sessionId]);

  useEffect(() => {
    if (!examStarted || !sessionId || autoSubmitted) return;
    const id = window.setInterval(() => {
      void flushAutosaveQueue(activeExamId);
    }, 15000);
    return () => window.clearInterval(id);
  }, [activeExamId, autoSubmitted, examStarted, sessionId]);

  useEffect(() => {
    const onOnline = () => {
      if (!examStarted || !sessionId || autoSubmitted) return;
      void flushAutosaveQueue(activeExamId);
      void flushIntegrityQueue(activeExamId);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [activeExamId, autoSubmitted, examStarted, sessionId]);

  useEffect(() => {
    if (integrityDisabled) return;
    if (!examStarted || !sessionId || autoSubmitted) return;
    void trackIntegrityEvent(activeExamId, 'exam_opened', { path: window.location.pathname });
  }, [activeExamId, autoSubmitted, examStarted, integrityDisabled, sessionId]);

  useEffect(() => {
    const token = accessToken;
    if (!token) return;

    let socketRef: Socket | null = createExamRealtimeSocket({
      baseUrl: appConfig.apiURL,
      token,
      examId: activeExamId,
      forcePolling: import.meta.env.VITE_SOCKET_FORCE_POLLING === 'true',
      handlers: {
        onState: (payload) => handlersRef.current.onState?.(payload),
        onStarted: (payload) => handlersRef.current.onStarted?.(payload),
        onFinal15: (payload) => handlersRef.current.onFinal15?.(payload),
        onForceSubmit: (payload) => handlersRef.current.onForceSubmit?.(payload),
        onAlert: (payload) => handlersRef.current.onAlert?.(payload),
        onError: (message) => handlersRef.current.onError?.(message),
        onDisconnect: () => handlersRef.current.onDisconnect?.(),
        onReconnecting: () => handlersRef.current.onReconnecting?.(),
        onConnect: () => handlersRef.current.onConnect?.(),
        // P0 Fix: Handle server-confirmed violation
        onViolationConfirmed: (payload) => handlersRef.current.onViolationConfirmed?.(payload),
      },
    });

    return () => {
      if (!socketRef) return;
      socketRef.emit('exam:leave', { examId: activeExamId });
      socketRef.close();
      socketRef = null;
    };
  }, [activeExamId, accessToken]);

  useEffect(() => {
    if (!teacherRuntimeLive || autoSubmitted || violationLocked || examStarted) return;
    if (!integrityDisabled && !document.fullscreenElement) return;
    void ensureSessionStarted();
  }, [
    teacherRuntimeLive,
    examStarted,
    integrityDisabled,
    autoSubmitted,
    violationLocked,
    fsRevision,
    ensureSessionStarted,
  ]);

  /** Đề đã tải nhưng chưa fullscreen → bắt modal/nút (kể cả bỏ lỡ socket teacherRuntimeLive). */
  useEffect(() => {
    if (integrityDisabled || autoSubmitted || violationLocked) return;
    if (!examStarted || total === 0) return;
    if (document.fullscreenElement) return;
    promptTeacherStartedFullscreenRef.current();
  }, [examStarted, total, integrityDisabled, autoSubmitted, violationLocked]);

  useEffect(() => {
    if (!violationLocked || autoSubmitted) return;
    if (!sessionId) return;
    const id = window.setTimeout(() => {
      if (autoSubmitCountdown <= 1) {
        forceAutoSubmit();
        return;
      }
      setAutoSubmitCountdown((v) => v - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [violationLocked, autoSubmitCountdown, autoSubmitted, forceAutoSubmit, sessionId]);

  useEffect(() => {
    if (!examStarted || autoSubmitted) return;
    if (!sessionId) return;
    if (remainingSeconds <= 0) {
      forceAutoSubmit();
    }
  }, [examStarted, remainingSeconds, autoSubmitted, forceAutoSubmit, sessionId]);

  useEffect(() => {
    if (!autoSubmitted || submitFailed || !examId) return;
    const id = window.setTimeout(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      navigate(`/result/${examId}`, { replace: true });
    }, 3000);
    return () => window.clearTimeout(id);
  }, [autoSubmitted, submitFailed, examId, navigate]);

  const currentQuestion = resolveQuestion(currentNumber);

  const answered = (() => {
    const s = new Set<number>();
    for (let n = 1; n <= total; n += 1) {
      const q = byNumber.get(n) ?? placeholderQuestion(n);
      if (isQuestionAnswered(q, answers)) s.add(n);
    }
    return s;
  })();

  const setAnswer = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentNumber)) next.delete(currentNumber);
      else next.add(currentNumber);
      return next;
    });
  };

  const goPrev = () => setCurrentNumber((n) => Math.max(1, n - 1));
  const goNext = () => setCurrentNumber((n) => Math.min(maxQuestionIndex, n + 1));

  const handleSubmit = () => {
    const modalId = 'exam-submit-confirm';
    const buildSubmitMessage = () => {
      const left = formatHms(remainingRef.current);
      return remainingRef.current > 0
        ? t('exam_take.submit_remaining', { left })
        : t('exam_take.submit_time_up');
    };

    const updateInterval = window.setInterval(() => {
      modals.updateModal({
        modalId,
        title: t('exam_take.submit_title'),
        centered: true,
        children: <Text size="sm">{buildSubmitMessage()}</Text>,
      });
    }, 1000);

    modals.openConfirmModal({
      modalId,
      centered: true,
      title: t('exam_take.submit_title'),
      children: <Text size="sm">{buildSubmitMessage()}</Text>,
      labels: { confirm: t('common.submit_exam'), cancel: t('common.cancel') },
      confirmProps: { color: 'primary' },
      onCancel: () => window.clearInterval(updateInterval),
      onConfirm: () => {
        window.clearInterval(updateInterval);
        void submitCurrentSession('manual');
        modals.closeAll();
      },
      onClose: () => window.clearInterval(updateInterval),
    });
  };

  if (bootLoading) {
    return (
      <Box className={classes.root}>
        <Paper withBorder radius="md" p="xl" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <Text fw={700} size="lg" mb={8}>
            Dang tai du lieu bai thi
          </Text>
          <Text c="dimmed" size="sm">
            He thong dang khoi tao phien thi va dong bo du lieu.
          </Text>
        </Paper>
      </Box>
    );
  }

  if (bootError) {
    return (
      <Box className={classes.root}>
        <Paper withBorder radius="md" p="xl" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <Text fw={700} size="lg" c="red" mb={8}>
            Khong the vao phong thi
          </Text>
          <Text size="sm">{bootError}</Text>
        </Paper>
      </Box>
    );
  }

  void fsRevision;

  const showFullscreenRequired =
    !integrityDisabled &&
    !inBrowserFullscreen &&
    !autoSubmitted &&
    !violationLocked &&
    (teacherRuntimeLive || (examStarted && total > 0));

  const showPreExamFullscreenGate =
    !integrityDisabled && !inBrowserFullscreen && !teacherRuntimeLive && !examStarted;

  const canShowExamShell =
    examStarted && total > 0 && (integrityDisabled || inBrowserFullscreen);

  return (
    <Box className={classes.root} ref={rootRef}>
      {autoSubmitted && (
        <Paper withBorder radius="md" p="xl" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <Text fw={700} size="lg" mb={8}>
            {submitFailed ? t('exam_take.submit_failed_title') : t('exam_take.submit_success_title')}
          </Text>
          <Text c="dimmed" size="sm">
            {submitFailed ? t('exam_take.submit_failed_desc') : t('exam_take.submit_success_desc')}
          </Text>
          {!submitFailed && submitResult && (
            <Box mt="md" ta="left">
              {(() => {
                const mcq = submitResult.details.filter((d) => d.question_type === 'mcq');
                const essays = submitResult.details.filter((d) => d.question_type === 'essay');
                const mcqScore = mcq.reduce((s, d) => s + (d.points_earned ?? 0), 0);
                const mcqMax = mcq.reduce((s, d) => s + d.max_points, 0);
                const mcqCorrect = mcq.filter((d) => d.is_correct).length;
                return (
                  <Stack gap={6}>
                    <Text size="sm" fw={600}>{t('exam_take.submit_mcq_graded')}</Text>
                    <Text size="sm">
                      {t('exam_take.submit_mcq_summary', {
                        correct: mcqCorrect,
                        total: mcq.length,
                        score: mcqScore,
                        max: mcqMax,
                      })}
                    </Text>
                    {essays.length > 0 && (
                      <Text size="sm" c="yellow.8">
                        {t('exam_take.submit_essay_pending', { count: essays.length })}
                      </Text>
                    )}
                  </Stack>
                );
              })()}
            </Box>
          )}
          {!submitFailed && (
            <Text size="xs" c="dimmed" mt="sm">
              {t('exam_take.submit_redirect_hint')}
            </Text>
          )}
          {!submitFailed && examId && (
            <Button
              mt="md"
              variant="light"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                navigate(`/result/${examId}`, { replace: true });
              }}
            >
              {t('exam_take.submit_view_result_now')}
            </Button>
          )}
          {!!serverForceSummaryText && (
            <Text size="sm" mt={8}>
              {serverForceSummaryText}
            </Text>
          )}
        </Paper>
      )}

      {!autoSubmitted && violationLocked && (
        <Paper withBorder radius="md" p="xl" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <Text fw={700} size="lg" c="red" mb={8}>
            Bài thi đã bị khóa do vi phạm
          </Text>
          <Text size="sm" mb={8}>
            {lockReason}
          </Text>
          <Text c="dimmed" size="sm">
            Tự động nộp sau {autoSubmitCountdown} giây...
          </Text>
        </Paper>
      )}

      {!autoSubmitted && !violationLocked && showPreExamFullscreenGate && (
        <Paper
          withBorder
          radius="md"
          p="xl"
          mb="md"
          style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', cursor: 'pointer' }}
          onClick={() => void requestFullscreen()}
        >
          <Text fw={700} size="lg" mb={8}>
            {t('exam_take.fullscreen_title')}
          </Text>
          <Text c="dimmed" size="sm" mb="md">
            {t('exam_take.fullscreen_desc')}
          </Text>
          {!!fullscreenError && (
            <Text c="red" size="sm" mb="md">
              {fullscreenError}
            </Text>
          )}
          <Button
            leftSection={<IconArrowsMaximize size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              void requestFullscreen();
            }}
          >
            {t('exam_take.fullscreen_button')}
          </Button>
        </Paper>
      )}
      {showFullscreenRequired && (
        <Paper
          withBorder
          radius="md"
          p="xl"
          mb="md"
          style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}
        >
          <Text fw={700} size="lg" mb={8} c="teal">
            {t('exam_take.exam_started_title')}
          </Text>
          <Text c="dimmed" size="sm" mb="md">
            {t('exam_take.exam_started_fullscreen_desc')}
          </Text>
          {!!fullscreenError && (
            <Text c="red" size="sm" mb="md">
              {fullscreenError}
            </Text>
          )}
          <Button
            size="md"
            color="teal"
            leftSection={<IconArrowsMaximize size={18} />}
            onClick={() => void requestFullscreen()}
          >
            {t('exam_take.exam_started_fullscreen_button')}
          </Button>
        </Paper>
      )}
      {!autoSubmitted && !violationLocked && !showFullscreenRequired && sessionLoading && (
        <Paper withBorder radius="md" p="xl" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <Text fw={700} size="lg" mb={8}>
            Dang tai de thi
          </Text>
          <Text c="dimmed" size="sm">
            He thong dang phan ma de va sap xep cau hoi...
          </Text>
        </Paper>
      )}
      {!autoSubmitted && !violationLocked && !showFullscreenRequired && !teacherRuntimeLive && !examStarted && !sessionLoading && (
        <Paper withBorder radius="md" p="xl" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <Text fw={700} size="lg" mb={8}>
            {t('exam_take.waiting_teacher_title')}
          </Text>
          <Text c="dimmed" size="sm" mb="md">
            {realtimeMessage || t('exam_take.waiting_teacher_desc')}
          </Text>
          {!inBrowserFullscreen && (
            <>
              <Text size="sm" c="orange" mb="sm">
                {t('exam_take.waiting_fullscreen_hint')}
              </Text>
              <Button
                mb="md"
                color="teal"
                leftSection={<IconArrowsMaximize size={16} />}
                onClick={() => void requestFullscreen()}
              >
                {t('exam_take.fullscreen_button')}
              </Button>
            </>
          )}
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              navigate('/exams');
            }}
          >
            {t('exam_take.exit_room')}
          </Button>
        </Paper>
      )}
      {!autoSubmitted && !violationLocked && canShowExamShell && !showFullscreenRequired && (
        <div className={classes.shell}>
          <ExamTakeHeader
            title={examTitle}
            section={examSection}
            remainingLabel={formatHms(remainingSeconds)}
            onSubmit={handleSubmit}
            submitting={submitting}
            versionCode={versionCode}
            connectionStatus={connectionStatus}
          />

          <div>
            <ExamQuestionPanel
              question={currentQuestion}
              displayIndex={currentNumber}
              totalQuestions={maxQuestionIndex}
              isFlagged={flagged.has(currentNumber)}
              onToggleFlag={toggleFlag}
              answers={answers}
              onAnswerChange={setAnswer}
            />
            <Box
              className={classes.mainCard}
              mt="md"
              style={{ paddingTop: 12, paddingBottom: 12 }}
            >
              <div className={classes.footerNav} style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                <Button
                  variant="default"
                  radius="md"
                  leftSection={<IconArrowLeft size={18} />}
                  onClick={goPrev}
                  disabled={currentNumber <= 1}
                >
                  {t('exam_take.prev_question')}
                </Button>
                <Button
                  radius="md"
                  rightSection={<IconArrowRight size={18} />}
                  onClick={goNext}
                  disabled={currentNumber >= maxQuestionIndex}
                >
                  {t('exam_take.next_question')}
                </Button>
              </div>
            </Box>
          </div>

          <QuestionNavigator
            total={total}
            current={currentNumber}
            answered={answered}
            flagged={flagged}
            filter={navFilter}
            onFilterChange={setNavFilter}
            onSelect={setCurrentNumber}
          />
        </div>
      )}
      {!autoSubmitted && !isFullscreen && (
        <Text size="xs" c="dimmed" ta="center" mt="xs">
          {t('exam_take.leave_count', { count: focusLeaveCount })}
        </Text>
      )}
      {!autoSubmitted && realtimeMessage && isFullscreen && (
        <Text size="xs" c="dimmed" ta="center" mt="xs">
          {realtimeMessage}
        </Text>
      )}
    </Box>
  );
};

export default ExamTake;
