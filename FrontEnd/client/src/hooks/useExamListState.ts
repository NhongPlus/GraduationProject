import { useEffect, useMemo, useState } from 'react';
import examApi, { type Exam, type ExamSession, type ForceSubmitSummary } from '@/services/examApi';

type StatusFilter = 'all' | 'not_done' | 'done';

export function useExamListState(opts: {
  isStaff: boolean;
  t: (key: string, options?: any) => string;
}) {
  const { isStaff, t } = opts;
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [activeSessionCountByExam, setActiveSessionCountByExam] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [startingExamId, setStartingExamId] = useState<string | null>(null);
  const [updatingExamId, setUpdatingExamId] = useState<string | null>(null);
  const [forceSubmittingExamId, setForceSubmittingExamId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        setNotice('');

        const examData = await examApi.getExams();
        setExams(examData);

        if (isStaff) {
          setSessions([]);
          const entries = await Promise.all(
            examData.map(async (exam) => {
              try {
                const examSessions = await examApi.getExamSessions(exam.id);
                const activeCount = examSessions.filter((s) => s.status === 'active').length;
                return [exam.id, activeCount] as const;
              } catch {
                return [exam.id, 0] as const;
              }
            })
          );
          setActiveSessionCountByExam(Object.fromEntries(entries));
        } else {
          const mySessions = await examApi.getMySessions();
          setSessions(mySessions);
          setActiveSessionCountByExam({});
        }
      } catch {
        setError(t('errors.exam_list_failed'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isStaff, t]);

  const latestSessionByExam = useMemo(() => {
    const byExam = new Map<string, ExamSession>();
    for (const s of sessions) {
      const prev = byExam.get(s.exam_id);
      if (!prev || new Date(s.started_at).getTime() > new Date(prev.started_at).getTime()) {
        byExam.set(s.exam_id, s);
      }
    }
    return byExam;
  }, [sessions]);

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesText = exam.title.toLowerCase().includes(searchText.toLowerCase());
      const status = isStaff
        ? (activeSessionCountByExam[exam.id] ?? 0) === 0
          ? 'done'
          : 'not_done'
        : (() => {
            const latest = latestSessionByExam.get(exam.id);
            return latest && latest.status !== 'active' ? 'done' : 'not_done';
          })();
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [activeSessionCountByExam, exams, isStaff, latestSessionByExam, searchText, statusFilter]);

  const doneCount = useMemo(() => {
    if (isStaff) {
      return exams.filter((exam) => (activeSessionCountByExam[exam.id] ?? 0) === 0).length;
    }
    return Array.from(latestSessionByExam.values()).filter((s) => s.status !== 'active').length;
  }, [activeSessionCountByExam, exams, isStaff, latestSessionByExam]);

  const handleForceSubmit = async (examId: string) => {
    const ok = window.confirm(t('exam_list.force_submit_confirm'));
    if (!ok) return;

    setForceSubmittingExamId(examId);
    setError('');

    try {
      const summary: ForceSubmitSummary = await examApi.forceSubmitExam(examId);
      setActiveSessionCountByExam((prev) => ({
        ...prev,
        [examId]: summary.failed_sessions,
      }));
      setNotice(
        t('exam_list.force_submit_done', {
          active: summary.active_sessions,
          submitted: summary.submitted_sessions,
          failed: summary.failed_sessions,
        })
      );
    } catch {
      setError(t('errors.exam_force_submit_failed'));
    } finally {
      setForceSubmittingExamId(null);
    }
  };

  const handleStartExam = async (exam: Exam) => {
    const ok = window.confirm(`Start bài thi "${exam.title}" trong ${exam.duration_min} phút?`);
    if (!ok) return;

    setStartingExamId(exam.id);
    setError('');
    try {
      const started = await examApi.startExamRuntime(exam.id);
      setNotice(`Đã start bài thi "${exam.title}" (${exam.duration_min} phút).`);
      console.info('[exam] started runtime', started);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Start bài thi thất bại.';
      setError(message);
    } finally {
      setStartingExamId(null);
    }
  };

  const handleUpdateDuration = async (exam: Exam) => {
    const raw = window.prompt('Nhập thời gian làm bài (phút):', String(exam.duration_min));
    if (raw == null) return;
    const duration = Number(raw);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 300) {
      setError('Thời gian thi phải từ 1 đến 300 phút.');
      return;
    }

    setUpdatingExamId(exam.id);
    setError('');
    try {
      const updated = await examApi.updateExam(exam.id, { duration_min: Math.floor(duration) });
      setExams((prev) => prev.map((item) => (item.id === exam.id ? updated : item)));
      setNotice(`Đã cập nhật thời gian "${updated.title}" thành ${updated.duration_min} phút.`);
    } catch {
      setError('Cập nhật thời gian thi thất bại.');
    } finally {
      setUpdatingExamId(null);
    }
  };

  return {
    exams,
    loading,
    error,
    notice,
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
    startingExamId,
    updatingExamId,
    forceSubmittingExamId,
    latestSessionByExam,
    activeSessionCountByExam,
    filteredExams,
    doneCount,
    handleStartExam,
    handleUpdateDuration,
    handleForceSubmit,
  };
}
