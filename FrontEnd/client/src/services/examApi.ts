import apiClient from './apiClient';
import type { ForceSubmitSummary } from './examRealtimeSocket';

export type { ForceSubmitSummary };

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  class_id?: string | null;
  admin_class_id?: string | null;
  num_versions?: number;
  subject_id?: string | null;
  created_by: string;
  duration_min: number;
  /** Hạn chót được phép bắt đầu phiên (ISO), null nếu không đặt */
  closes_at?: string | null;
  created_at: string;
  subject_name?: string;
  subject_code?: string | null;
  admin_class_name?: string | null;
  class_semester?: string;
  class_year?: number;
  creator_name?: string | null;
  /** true khi GV đã bật thi (start-runtime) và chưa hết giờ */
  runtime_is_active?: boolean;
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
  media_url?: string | null;
  explanation?: string | null;
  version_index?: number;
}

export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  /** BE: cột submitted_at khi nộp bài */
  submitted_at?: string | null;
  finished_at?: string | null;
  status: 'active' | 'submitted' | 'expired';
  score?: number | null;
  max_points?: number | null;
  grading_status?: 'pending_manual' | 'complete' | null;
  /** Có khi GET /exams/:examId/sessions (JOIN accounts) */
  full_name?: string | null;
  email?: string | null;
  /** Từ getSessionsByExamWithStudent — tên sinh viên */
  student_name?: string | null;
  student_email?: string | null;
  version_code?: string | null;
}

export interface StartSessionData {
  session: ExamSession;
  deadline_at: string;
  duration_min: number;
  version_code: string;
  version_id: string;
  questions: Array<{
    id: string;
    display_order: number;
    content: string;
    question_type: QuestionType;
    options: Record<string, string> | null;
    points: number;
    media_url?: string | null;
  }>;
  /** Đồng hồ lớp khi GV đã bật thi — ưu tiên hơn deadline cá nhân */
  runtime_state?: {
    started_at: string;
    ends_at: string;
    is_active: boolean;
  } | null;
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
    correct?: string | string[] | null;
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

export interface SessionReview {
  session: ExamSession;
  exam: Exam;
  score: number | null;
  max_points: number | null;
  grading_status: 'pending_manual' | 'complete' | null;
  questions: Array<{
    question_id: string;
    question_type: QuestionType;
    content: string;
    options: Record<string, string> | null;
    explanation: string | null;
    submitted: string | string[] | null;
    correct: string | string[] | null;
    is_correct: boolean;
    points_earned: number | null;
    max_points: number;
    pending_grading?: boolean;
    teacher_comment?: string | null;
  }>;
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
  difficulty?: "DE" | "TRUNGBINH" | "KHO";
  chapter?: number;
  media?: { type: "image" | "audio" | "video"; filename: string; status: "found" | "missing" | "embedded"; url?: string } | null;
  /** URL sau upload (Cloudinary); BE commit/import đọc kèm media.url */
  media_url?: string | null;
  answer_hint?: string | null;
  ai_confidence?: number;
  needs_review?: boolean;
  review_reason?: string | null;
  version_index?: number;
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
  parse_summary?: {
    total_parsed: number;
    auto_ok: number;
    needs_review: number;
    missing_media: number;
    parse_time_ms: number;
  };
}

export interface MediaUploadResult {
  url: string;
  public_id: string;
  resource_type: 'image' | 'video' | 'raw';
  bytes: number;
  format?: string | null;
}

export interface PredictionSubject {
  subject: string;
  semester: number;
  credits: number;
  predicted_score: number;
  grade: string;
  confidence: number;
  trend: 'up' | 'stable' | 'down';
  correlation_r: number;
  reasoning: string;
}

export interface JustCompleted {
  subject: string;
  score: number;
  grade: string;
  vs_class_avg?: string;
  analysis?: string;
}

export interface PredictionResult {
  just_completed: JustCompleted;
  predictions: PredictionSubject[];
  overall_advice: string;
}

export interface PredictionRecomputeSummary {
  total_students: number;
  computed: number;
  skipped_no_data: number;
  failed: number;
  errors: string[];
}

const examApi = {
  getExams: async (classId?: string, extraParams?: Record<string, string>): Promise<Exam[]> => {
    const params: Record<string, string> = {};
    if (classId) params.class_id = classId;
    if (extraParams) Object.assign(params, extraParams);
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
    payload: Partial<Pick<Exam, 'title' | 'description' | 'duration_min' | 'closes_at' | 'num_versions'>>
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
      media_url?: string | null;
      version_index?: number;
    }
  ): Promise<Question> => {
    const res = await apiClient.post<{ success: boolean; data: Question }>(
      `/exams/${examId}/questions`,
      payload
    );
    return res.data.data;
  },

  updateQuestion: async (
    examId: string,
    questionId: string,
    payload: {
      content: string;
      points: number;
      question_type: QuestionType;
      options?: Record<string, string> | null;
      correct_answer?: string | string[] | null;
      media_url?: string | null;
      display_order: number;
    }
  ): Promise<Question> => {
    const res = await apiClient.patch<{ success: boolean; data: Question }>(
      `/exams/${examId}/questions/${questionId}`,
      payload
    );
    return res.data.data;
  },

  downloadWordImportTemplate: async (): Promise<void> => {
    const res = await apiClient.get<Blob>('/exams/import-word/template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exam_template_GiaoVien.docx';
    link.click();
    URL.revokeObjectURL(url);
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
    admin_class_id: string;
    subject_id: string;
    class_id?: string | null;
    duration_min: number;
    description?: string | null;
    closes_at?: string | null;
    num_versions?: number;
    questions: ImportedQuestionDraft[];
  }): Promise<{ exam: Exam; questions: Question[] }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { exam: Exam; questions: Question[] };
    }>('/exams/import-word/commit', payload);
    return res.data.data;
  },

  aiRecomposeExam: async (payload: {
    file: File;
    examInfo: { title?: string; duration_min?: number; description?: string };
  }): Promise<ExamImportPreview> => {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('examInfo', JSON.stringify(payload.examInfo));
    const res = await apiClient.post<{ success: boolean; data: ExamImportPreview }>(
      '/exams/import-word/ai-recompose',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 }
    );
    return res.data.data;
  },

  uploadExamMedia: async (file: File): Promise<MediaUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<{ success: boolean; data: MediaUploadResult }>(
      '/exams/upload-media',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
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

  getExamSessions: async (examId: string, params?: { page?: number; limit?: number }): Promise<ExamSession[]> => {
    const query = params ? `?page=${params.page ?? 1}&limit=${params.limit ?? 20}` : '';
    const res = await apiClient.get<{ success: boolean; data: ExamSession[] }>(
      `/exams/${examId}/sessions${query}`
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

  getSessionReview: async (sessionId: string): Promise<SessionReview> => {
    const res = await apiClient.get<{ success: boolean; data: SessionReview }>(
      `/exams/sessions/${sessionId}/review`
    );
    return res.data.data;
  },

  getExamProctoring: async (
    examId: string
  ): Promise<{
    exam_id: string;
    total_sessions: number;
    active_sessions: number;
    submitted_sessions: number;
    expired_sessions: number;
    sessions: Array<{
      session_id: string;
      student_id: string;
      student_name: string | null;
      student_email: string | null;
      status: "active" | "submitted" | "expired";
      started_at: string;
      finished_at: string | null;
      score: number | null;
      max_points: number | null;
      violation_count: number;
      violations: Array<{
        event_type: string;
        client_at: string;
        details: Record<string, unknown> | null;
      }>;
    }>;
  }> => {
    const res = await apiClient.get<{
      success: boolean;
      data: {
        exam_id: string;
        total_sessions: number;
        active_sessions: number;
        submitted_sessions: number;
        expired_sessions: number;
        sessions: Array<{
          session_id: string;
          student_id: string;
          student_name: string | null;
          student_email: string | null;
          status: "active" | "submitted" | "expired";
          started_at: string;
          finished_at: string | null;
          score: number | null;
          max_points: number | null;
          violation_count: number;
          violations: Array<{
            event_type: string;
            client_at: string;
            details: Record<string, unknown> | null;
          }>;
        }>;
      };
    }>(`/exams/${examId}/proctoring`);
    return res.data.data;
  },

  /** Sinh viên / admin: đọc cache do admin tính batch (không gọi MiniMax từ trình duyệt). */
  getMyPredictionCache: async (): Promise<PredictionResult | null> => {
    const res = await apiClient.get<{ success: boolean; data: PredictionResult | null }>(
      '/prediction/me'
    );
    return res.data.data;
  },

  /** Admin: tính lại dự đoán cho mọi sinh viên có dữ liệu, ghi cache. */
  adminRecomputeAllPredictions: async (): Promise<PredictionRecomputeSummary> => {
    const res = await apiClient.post<{ success: boolean; data: PredictionRecomputeSummary }>(
      '/prediction/admin/recompute-all',
      {},
      { timeout: 300_000 }
    );
    return res.data.data;
  },
};

export default examApi;
