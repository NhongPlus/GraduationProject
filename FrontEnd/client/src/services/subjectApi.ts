import apiClient from './apiClient';

export interface SubjectDto {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  sub_category?: string | null;
  is_active: boolean;
  created_at: string;
}

export const SUBJECT_CATEGORY_LABELS: Record<string, string> = {
  foundation: 'Khối nền tảng',
  ai_ml: 'Khối AI/ML',
  software_eng: 'Khối Software Engineering',
  internship: 'Khối thực tập / đồ án',
  general_ed: 'Khối đại cương',
  skills_support: 'Khối kỹ năng / hỗ trợ',
  general: 'Khác',
  programming: 'Lập trình',
  english: 'Tiếng Anh',
  math: 'Toán',
  network: 'Mạng',
};

const subjectApi = {
  getSubjects: async (): Promise<SubjectDto[]> => {
    const res = await apiClient.get<{ success: boolean; data: SubjectDto[] }>('/subjects');
    return res.data.data;
  },
  createSubject: async (data: Partial<SubjectDto>): Promise<SubjectDto> => {
    const res = await apiClient.post<{ success: boolean; data: SubjectDto }>('/subjects', data);
    return res.data.data;
  },
  updateSubject: async (id: string, data: Partial<SubjectDto>): Promise<SubjectDto> => {
    const res = await apiClient.patch<{ success: boolean; data: SubjectDto }>(`/subjects/${id}`, data);
    return res.data.data;
  },
  deleteSubject: async (id: string): Promise<void> => {
    await apiClient.delete(`/subjects/${id}`);
  },
};

export default subjectApi;
