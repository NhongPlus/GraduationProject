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
  score: number | null;
  max_points: number | null;
  submitted_at: string | null;
  status: string | null;
}

export interface GradeReport {
  class_name: string;
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

  getGradeReport: async (): Promise<GradeReport> => {
    const res = await apiClient.get<{ success: boolean; data: GradeReport }>(
      '/teacher-students/grade-report'
    );
    return res.data.data;
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
