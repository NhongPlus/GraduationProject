import apiClient from './apiClient';

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  class_id: string;
  created_by: string;
  duration_min: number;
  created_at: string;
  subject_name?: string;
  class_semester?: string;
  class_year?: number;
  creator_name?: string | null;
}

export interface Question {
  id: string;
  exam_id: string;
  content: string;
  options: Record<string, string>;
  points: number;
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
}

export interface SubmitResult {
  session: ExamSession;
  score: number;
  total_points: number;
  correct_count: number;
  total_questions: number;
  details: Array<{
    question_id: string;
    submitted: string | string[] | null;
    correct: string | string[];
    is_correct: boolean;
    points_earned: number;
  }>;
}

const examApi = {
  // --- Exams ---
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
  }): Promise<Exam> => {
    const res = await apiClient.post<{ success: boolean; data: Exam }>('/exams', payload);
    return res.data.data;
  },

  deleteExam: async (id: string): Promise<void> => {
    await apiClient.delete(`/exams/${id}`);
  },

  // --- Questions ---
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
      options: Record<string, string>;
      correct_answer: string | string[];
      points: number;
    }
  ): Promise<Question> => {
    const res = await apiClient.post<{ success: boolean; data: Question }>(
      `/exams/${examId}/questions`,
      payload
    );
    return res.data.data;
  },

  deleteQuestion: async (examId: string, questionId: string): Promise<void> => {
    await apiClient.delete(`/exams/${examId}/questions/${questionId}`);
  },

  // --- Sessions ---
  startSession: async (examId: string): Promise<ExamSession> => {
    const res = await apiClient.post<{ success: boolean; data: ExamSession }>(
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
};

export default examApi;