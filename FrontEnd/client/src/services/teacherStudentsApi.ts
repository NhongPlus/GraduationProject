import apiClient from './apiClient';
import { fetchPaginatedList, type ListQueryParams, type PaginatedList } from './listApi';

export interface StudentItem {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GradeRow {
  student_id: string;
  full_name: string | null;
  username: string;
  email: string;
  exam_id: string | null;
  exam_title: string | null;
  session_id: string | null;
  version_code: string | null;
  score: number | null;
  max_points: number | null;
  submitted_at: string | null;
  status: string | null;
  grading_status: string | null;
}

export interface GradeExamOption {
  id: string;
  title: string;
  submitted_count: number;
}

export interface GradeReport {
  class_name: string;
  exam_id: string | null;
  rows: GradeRow[];
}

const teacherStudentsApi = {
  list: (params: ListQueryParams = {}): Promise<PaginatedList<StudentItem>> =>
    fetchPaginatedList<StudentItem>('/teacher-students', params),

  add: async (body: {
    full_name?: string;
    username: string;
    email: string;
    password: string;
  }): Promise<StudentItem> => {
    const res = await apiClient.post<{ success: boolean; data: StudentItem }>(
      '/teacher-students',
      body
    );
    return res.data.data;
  },

  update: async (
    id: string,
    fields: { full_name?: string; is_active?: boolean }
  ): Promise<StudentItem> => {
    const res = await apiClient.patch<{ success: boolean; data: StudentItem }>(
      `/teacher-students/${id}`,
      fields
    );
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/teacher-students/${id}`);
  },

  getGradeExams: async (): Promise<{ class_name: string; exams: GradeExamOption[] }> => {
    const res = await apiClient.get<{
      success: boolean;
      data: { class_name: string; exams: GradeExamOption[] };
    }>('/teacher-students/grade-report/exams');
    return res.data.data;
  },

  getGradeReport: async (examId?: string): Promise<GradeReport> => {
    const res = await apiClient.get<{ success: boolean; data: GradeReport }>(
      '/teacher-students/grade-report',
      { params: examId ? { exam_id: examId } : {} }
    );
    return res.data.data;
  },

  downloadGradeExport: async (examId: string): Promise<void> => {
    const res = await apiClient.get('/teacher-students/grade-report/export', {
      params: { exam_id: examId },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cd = res.headers['content-disposition'] as string | undefined;
    const match = cd?.match(/filename="?([^"]+)"?/);
    a.download = match?.[1] ?? `bang_diem_chi_tiet.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  sendGradeEmail: async (studentIds?: string[]): Promise<{ sent: number; total: number }> => {
    const res = await apiClient.post<{ success: boolean; data: { sent: number; total: number } }>(
      '/teacher-students/grade-report/email',
      { student_ids: studentIds }
    );
    return res.data.data;
  },
};

export default teacherStudentsApi;
