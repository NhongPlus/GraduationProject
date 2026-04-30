import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Paper, Text } from '@mantine/core';
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
import examApi, { type Question as ApiQuestion } from '@/services/examApi';
import { useExamTakeState } from '@/hooks/useExamTakeState';
import useAuth from '@/hooks/useAuth';
import {
  flushAutosaveQueue,
  queueAutosave,
  saveDraftAnswers,
} from '@/services/examAutosaveClient';
import { flushIntegrityQueue, trackIntegrityEvent } from '@/services/examIntegrityClient';
import { createExamRealtimeSocket, type ForceSubmitPayload } from '@/services/examRealtimeSocket';
import classes from '@/components/ExamTake/ExamTake.module.scss';

function formatHms(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
}

function toUiQuestion(question: ApiQuestion, number: number): MockExamQuestion {
  if (question.question_type === 'essay') {
    return {
      number,
      points: question.points,
      type: 'essay',
      prompt: question.content,
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
    options,
  };
}

function buildSubmitAnswers(
  answers: Record<string, string>,
  questionIdByNumber: Record<number, string>,
  questionByNumber: Map<number, MockExamQuestion>,
): Record<string, string | string[]> {
  const payload: Record<string, string | string[]> = {};

  for (const [rawNumber, questionId] of Object.entries(questionIdByNumber)) {
    const number = Number(rawNumber);
    const question = questionByNumber.get(number);
    if (!question) continue;

    const answerKey = `q${number}`;
    const rawAnswer = answers[answerKey];

    if (question.type === 'essay') {
      const essay = rawAnswer?.trim();
      if (essay) payload[questionId] = essay;
      continue;
    }

    if (question.type === 'mcq' && rawAnswer) {
      payload[questionId] = rawAnswer;
    }
  }

  return payload;
}

const ExamTake = () => {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const activeExamId = examId ?? 'preview-exam';
  const [fullscreenError, setFullscreenError] = useState('');

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
    boot: { sessionId, setSessionId, bootLoading, setBootLoading, bootError, setBootError },
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
        await examApi.submitSession(sessionId, payload);

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
    if (!examId || sessionId || sessionStartingRef.current) return;
    sessionStartingRef.current = true;
    try {
      const startData = await examApi.startSession(activeExamId);
      setSessionId(startData.session.id);
      const deadlineMs = Date.parse(startData.deadline_at);
      if (!Number.isNaN(deadlineMs)) {
        setRemainingSeconds(Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000)));
      }
    } catch {
      setBootError('Khong the khoi tao phien thi.');
      setExamStarted(false);
    } finally {
      sessionStartingRef.current = false;
    }
  }, [activeExamId, examId, sessionId]);

  const forceAutoSubmit = useCallback(() => {
    if (autoSubmitted || submitting) return;
    if (!sessionId) {
      setRealtimeMessage('He thong dang khoi tao phien thi, chua the tu dong nop bai.');
      return;
    }
    void submitCurrentSession('auto');
  }, [autoSubmitted, sessionId, submitting, submitCurrentSession]);

  const triggerViolationLock = useCallback((reason: string) => {
    const now = Date.now();
    if (now - lastViolationAtRef.current < 1200) return;
    lastViolationAtRef.current = now;
    if (violationTriggeredRef.current) return;
    violationTriggeredRef.current = true;
    setLockReason(reason);
    setAutoSubmitCountdown(5);
    setViolationLocked(true);
  }, [lastViolationAtRef, setAutoSubmitCountdown, setLockReason, setViolationLocked, violationTriggeredRef]);

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
        const [examData, questionData] = await Promise.all([
          examApi.getExam(activeExamId),
          examApi.getQuestions(activeExamId),
        ]);
        if (canceled) return;

        setExamTitle(examData.title || 'Bai thi');
        setExamSection(examData.subject_name || examData.description || '');

        const mappedQuestions = questionData.map((q, idx) => toUiQuestion(q, idx + 1));
        const idMap: Record<number, string> = {};
        for (let i = 0; i < questionData.length; i += 1) {
          idMap[i + 1] = questionData[i].id;
        }
        setQuestions(mappedQuestions);
        setQuestionIdByNumber(idMap);
        setSessionId(null);
        setCurrentNumber(1);
        setRemainingSeconds(0);
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

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!examStarted || autoSubmitted) return;
      setRemainingSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [examStarted, autoSubmitted]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const full = Boolean(document.fullscreenElement);
      setIsFullscreen(full);
      if (full) setFullscreenError('');
      if (examStarted || full) {
        void trackIntegrityEvent(activeExamId, full ? 'fullscreen_enter' : 'fullscreen_exit');
      }
      // Chi khoa bai khi da vao fullscreen va dang thi, tranh trigger ngay lan dau vao man hinh.
      if (!full && isFullscreen && examStarted && !autoSubmitted) {
        triggerViolationLock('Phát hiện thoát toàn màn hình. Bài thi sẽ bị khóa và tự động nộp.');
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
    };
  }, [activeExamId, autoSubmitted, examStarted, isFullscreen, setIsFullscreen, t, triggerViolationLock]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!examStarted || autoSubmitted) return;
      if (document.hidden) {
        setFocusLeaveCount((v) => v + 1);
        void trackIntegrityEvent(activeExamId, 'visibility_hidden');
        triggerViolationLock('Phát hiện rời khỏi tab thi. Bài thi sẽ bị khóa và tự động nộp.');
      }
    };
    const onWindowBlur = () => {
      if (!examStarted || autoSubmitted) return;
      setFocusLeaveCount((v) => v + 1);
      void trackIntegrityEvent(activeExamId, 'window_blur');
      triggerViolationLock('Phát hiện mất focus cửa sổ thi. Bài thi sẽ bị khóa và tự động nộp.');
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
    const onContextMenu = () => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'context_menu');
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
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [activeExamId, autoSubmitted, examStarted]);
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
    if (!examStarted || !sessionId || autoSubmitted) return;
    void trackIntegrityEvent(activeExamId, 'exam_opened', { path: window.location.pathname });
  }, [activeExamId, autoSubmitted, examStarted, sessionId]);

  useEffect(() => {
    const token = accessToken;
    if (!token) return;

    let socketRef: Socket | null = createExamRealtimeSocket({
      baseUrl: appConfig.apiURL,
      token,
      examId: activeExamId,
      forcePolling: import.meta.env.VITE_SOCKET_FORCE_POLLING === 'true',
      handlers: {
        onState: (payload) => {
          if (payload.status === 'started' && payload.endsAt) {
            const nowMs = payload.serverNowMs ?? Date.now();
            const endMs = Date.parse(payload.endsAt);
            if (!Number.isNaN(endMs)) {
              setRemainingSeconds(Math.max(0, Math.floor((endMs - nowMs) / 1000)));
            }
            setExamStarted(true);
            setAutoSubmitted(false);
            setSubmitFailed(false);
            setViolationLocked(false);
            setRealtimeMessage('');
            violationTriggeredRef.current = false;
            void ensureSessionStarted();
          } else if (payload.status === 'not_started') {
            setExamStarted(false);
            setRealtimeMessage('Giang vien chua bat dau bai thi. Vui long cho...');
          }
        },
        onStarted: (payload) => {
          const endMs = Date.parse(payload.endsAt);
          if (!Number.isNaN(endMs)) {
            setRemainingSeconds(Math.max(0, Math.floor((endMs - Date.now()) / 1000)));
          }
          setExamStarted(true);
          setAutoSubmitted(false);
          setSubmitFailed(false);
          setViolationLocked(false);
          violationTriggeredRef.current = false;
          setRealtimeMessage('Bai thi da bat dau. Chuc ban lam bai tot.');
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
      },
    });

    return () => {
      if (socketRef) {
        socketRef.emit('exam:leave', { examId: activeExamId });
        socketRef.close();
        socketRef = null;
      }
    };
  }, [activeExamId, accessToken, applyServerForceSubmit, ensureSessionStarted]);

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
    if (!autoSubmitted) return;
    const id = window.setTimeout(() => {
      navigate('/main');
    }, 5000);
    return () => window.clearTimeout(id);
  }, [autoSubmitted, navigate]);

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

  const requestFullscreen = async () => {
    setFullscreenError('');
    if (!document.documentElement.requestFullscreen) {
      setFullscreenError(t('exam_take.fullscreen_error'));
      void trackIntegrityEvent(activeExamId, 'fullscreen_error', { reason: 'unsupported' });
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      // Browser có thể chặn nếu không phải user gesture hợp lệ.
      setFullscreenError(t('exam_take.fullscreen_error'));
      void trackIntegrityEvent(activeExamId, 'fullscreen_error', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
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

  return (
    <Box className={classes.root}>
      {autoSubmitted && (
        <Paper withBorder radius="md" p="xl" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <Text fw={700} size="lg" mb={8}>
            {submitFailed ? 'Bai thi da ket thuc nhung nop bai that bai' : 'Bai thi da duoc nop'}
          </Text>
          <Text c="dimmed" size="sm">
            {submitFailed
              ? 'He thong khong gui duoc bai lam len server. Vui long lien he giam thi de xu ly.'
              : 'He thong da ghi nhan bai lam va ket thuc phien thi.'}
          </Text>
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

      {!autoSubmitted && !violationLocked && !isFullscreen && (
        <Paper
          withBorder
          radius="md"
          p="xl"
          mb="md"
          style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}
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
          <Button leftSection={<IconArrowsMaximize size={16} />} onClick={requestFullscreen}>
            {t('exam_take.fullscreen_button')}
          </Button>
        </Paper>
      )}
      {!autoSubmitted && !violationLocked && isFullscreen && !examStarted && (
        <Paper withBorder radius="md" p="xl" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <Text fw={700} size="lg" mb={8}>
            Dang cho giang vien bat dau
          </Text>
          <Text c="dimmed" size="sm">
            {realtimeMessage || 'He thong dang dong bo trang thai bai thi...'}
          </Text>
        </Paper>
      )}
      {!autoSubmitted && !violationLocked && isFullscreen && examStarted && (
        <div className={classes.shell}>
          <ExamTakeHeader
            title={examTitle}
            section={examSection}
            remainingLabel={formatHms(remainingSeconds)}
            onSubmit={handleSubmit}
            submitting={submitting}
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
