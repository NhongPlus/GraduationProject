import apiClient from './apiClient';

export interface AdminClassDto {
  id: string;
  program_code: string;
  intake_year: number;
  section: string;
  display_name: string;
  manager_teacher_id: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  student_count?: number;
  created_at: string;
}

const adminClassApi = {
  getMine: async (): Promise<AdminClassDto> => {
    const res = await apiClient.get<{ success: boolean; data: AdminClassDto }>('/admin-classes/me');
    return res.data.data;
  },
  getClasses: async (): Promise<AdminClassDto[]> => {
    const res = await apiClient.get<{ success: boolean; data: AdminClassDto[] }>('/admin-classes');
    return res.data.data;
  },
};

export default adminClassApi;
