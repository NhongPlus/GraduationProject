import apiClient from './apiClient';

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  class_id: string;
  created_by: string;
  duration_min: number;
  /** Hạn chót được phép bắt đầu phiên (ISO), null nếu không đặt */
  closes_at?: string | null;
  created_at: string;
  subject_name?: string;
  class_semester?: string;
  class_year?: number;
  creator_name?: string | null;
}

export type QuestionType = 'mcq' | 'essay';

export interface Question {
  id: string;
  exam_id: string;
  content: string;
  question_type: QuestionType;
  options: Record<string, string> | null;
  points: number;
  display_order?: number;
  created_at: string;
  correct_answer?: string | string[];
}

export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  finished_at: string | null;
  status: 'active' | 'submitted' | 'expired';
  score?: number | null;
  max_points?: number | null;
  grading_status?: 'pending_manual' | 'complete' | null;
}

export interface StartSessionData {
  session: ExamSession;
  deadline_at: string;
  duration_min: number;
}

export interface SubmitResult {
  session: ExamSession;
  score: number;
  total_points: number;
  correct_count: number;
  total_questions: number;
  grading_status: 'pending_manual' | 'complete';
  details: Array<{
    question_id: string;
    question_type: QuestionType;
    submitted: string | string[] | null;
    is_correct: boolean;
    points_earned: number | null;
    max_points: number;
    pending_grading?: boolean;
  }>;
}

export interface MySubmission {
  session: ExamSession;
  score: number | null;
  max_points: number | null;
  grading_status: 'pending_manual' | 'complete' | null;
  details: SubmitResult['details'];
}

export interface GradingPayload {
  session: ExamSession;
  exam: Exam;
  student: { full_name: string | null; email: string | null };
  questions: Question[];
  graded_details: Array<{
    question_id: string;
    question_type: QuestionType;
    submitted: string | string[] | null;
    correct?: string | string[] | null;
    is_correct: boolean;
    points_earned: number | null;
    max_points: number;
    pending_grading?: boolean;
    teacher_comment?: string | null;
  }>;
}

export interface ForceSubmitSummary {
  exam_id: string;
  active_sessions: number;
  submitted_sessions: number;
  failed_sessions: number;
}

export interface StartRuntimeResult {
  examId: string;
  startedAt: string;
  endsAt: string;
  durationMin: number;
}

export interface ImportedQuestionDraft {
  content: string;
  question_type: QuestionType;
  points: number;
  options?: Record<string, string> | null;
  correct_answer?: string | string[] | null;
  display_order: number;
}

export interface ExamImportPreview {
  exam: {
    title?: string;
    duration_min?: number;
    description?: string;
  };
  questions: ImportedQuestionDraft[];
  errors: string[];
  warnings: string[];
}

const examApi = {
  getExams: async (classId?: string): Promise<Exam[]> => {
    const params = classId ? { class_id: classId } : {};
    const res = await apiClient.get<{ success: boolean; data: Exam[] }>('/exams', { params });
    return res.data.data;
  },

  getExam: async (id: string): Promise<Exam> => {
    const res = await apiClient.get<{ success: boolean; data: Exam }>(`/exams/${id}`);
    return res.data.data;
  },

  createExam: async (payload: {
    title: string;
    class_id: string;
    duration_min: number;
    description?: string;
    closes_at?: string | null;
  }): Promise<Exam> => {
    const res = await apiClient.post<{ success: boolean; data: Exam }>('/exams', payload);
    return res.data.data;
  },

  updateExam: async (
    id: string,
    payload: Partial<Pick<Exam, 'title' | 'description' | 'duration_min' | 'closes_at'>>
  ): Promise<Exam> => {
    const res = await apiClient.patch<{ success: boolean; data: Exam }>(`/exams/${id}`, payload);
    return res.data.data;
  },

  deleteExam: async (id: string): Promise<void> => {
    await apiClient.delete(`/exams/${id}`);
  },

  getQuestions: async (examId: string): Promise<Question[]> => {
    const res = await apiClient.get<{ success: boolean; data: Question[] }>(
      `/exams/${examId}/questions`
    );
    return res.data.data;
  },

  addQuestion: async (
    examId: string,
    payload: {
      content: string;
      points: number;
      question_type?: QuestionType;
      options?: Record<string, string>;
      correct_answer?: string | string[];
    }
  ): Promise<Question> => {
    const res = await apiClient.post<{ success: boolean; data: Question }>(
      `/exams/${examId}/questions`,
      payload
    );
    return res.data.data;
  },

  previewWordImport: async (file: File): Promise<ExamImportPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<{ success: boolean; data: ExamImportPreview }>(
      '/exams/import-word/preview',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data;
  },

  commitWordImport: async (payload: {
    title: string;
    class_id: string;
    duration_min: number;
    description?: string | null;
    closes_at?: string | null;
    questions: ImportedQuestionDraft[];
  }): Promise<{ exam: Exam; questions: Question[] }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { exam: Exam; questions: Question[] };
    }>('/exams/import-word/commit', payload);
    return res.data.data;
  },

  deleteQuestion: async (examId: string, questionId: string): Promise<void> => {
    await apiClient.delete(`/exams/${examId}/questions/${questionId}`);
  },

  startSession: async (examId: string): Promise<StartSessionData> => {
    const res = await apiClient.post<{ success: boolean; data: StartSessionData }>(
      `/exams/${examId}/sessions`
    );
    return res.data.data;
  },

  submitSession: async (
    sessionId: string,
    answers: Record<string, string | string[]>
  ): Promise<SubmitResult> => {
    const res = await apiClient.post<{ success: boolean; data: SubmitResult }>(
      `/exams/sessions/${sessionId}/submit`,
      { answers }
    );
    return res.data.data;
  },

  getMySessions: async (): Promise<ExamSession[]> => {
    const res = await apiClient.get<{ success: boolean; data: ExamSession[] }>(
      '/exams/sessions/me'
    );
    return res.data.data;
  },

  getExamSessions: async (examId: string): Promise<ExamSession[]> => {
    const res = await apiClient.get<{ success: boolean; data: ExamSession[] }>(
      `/exams/${examId}/sessions`
    );
    return res.data.data;
  },

  forceSubmitExam: async (examId: string): Promise<ForceSubmitSummary> => {
    const res = await apiClient.post<{ success: boolean; data: ForceSubmitSummary }>(
      `/exams/${examId}/force-submit`
    );
    return res.data.data;
  },

  startExamRuntime: async (examId: string): Promise<StartRuntimeResult> => {
    const res = await apiClient.post<{ success: boolean; data: StartRuntimeResult }>(
      `/exams/${examId}/start-runtime`
    );
    return res.data.data;
  },

  getMySubmission: async (examId: string): Promise<MySubmission> => {
    const res = await apiClient.get<{ success: boolean; data: MySubmission }>(
      `/exams/${examId}/my-submission`
    );
    return res.data.data;
  },

  getSessionGrading: async (sessionId: string): Promise<GradingPayload> => {
    const res = await apiClient.get<{ success: boolean; data: GradingPayload }>(
      `/exams/sessions/${sessionId}/grading`
    );
    return res.data.data;
  },

  gradeSession: async (
    sessionId: string,
    grades: Record<string, { points_awarded: number; comment?: string }>
  ): Promise<ExamSession> => {
    const res = await apiClient.patch<{ success: boolean; data: ExamSession }>(
      `/exams/sessions/${sessionId}/grade`,
      { grades }
    );
    return res.data.data;
  },
};

export default examApi;
