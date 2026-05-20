import apiClient from './apiClient';
import { fetchPaginatedList, fetchAllListItems, type ListQueryParams, type PaginatedList } from './listApi';

export type SubjectPrerequisiteRef = {
  id: string;
  name: string;
  code: string;
};

export interface SubjectDto {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  sub_category?: string | null;
  program_id?: string | null;
  prerequisites?: SubjectPrerequisiteRef[];
  prerequisite_ids?: string[];
  is_active: boolean;
  created_at: string;
}

export type CreateSubjectPayload = {
  name: string;
  code?: string;
  credits?: number;
  semester?: number;
  category?: string;
  sub_category?: string | null;
  prerequisite_ids?: string[];
  program_id?: string | null;
};

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
  listSubjects: async (
    params: ListQueryParams & { program_id?: string } = {}
  ): Promise<PaginatedList<SubjectDto>> =>
    fetchPaginatedList<SubjectDto>('/subjects', params),

  getSubjects: async (): Promise<SubjectDto[]> => fetchAllListItems<SubjectDto>('/subjects'),

  getSubject: async (id: string): Promise<SubjectDto> => {
    const res = await apiClient.get<{ success: boolean; data: SubjectDto }>(`/subjects/${id}`);
    return res.data.data;
  },

  createSubject: async (data: CreateSubjectPayload): Promise<SubjectDto> => {
    const res = await apiClient.post<{ success: boolean; data: SubjectDto }>('/subjects', data);
    return res.data.data;
  },
  updateSubject: async (id: string, data: Partial<CreateSubjectPayload> & { is_active?: boolean }): Promise<SubjectDto> => {
    const res = await apiClient.patch<{ success: boolean; data: SubjectDto }>(`/subjects/${id}`, data);
    return res.data.data;
  },

  setPrerequisites: async (id: string, prerequisiteIds: string[]): Promise<SubjectDto> => {
    const res = await apiClient.put<{ success: boolean; data: SubjectDto }>(
      `/subjects/${id}/prerequisites`,
      { prerequisite_ids: prerequisiteIds }
    );
    return res.data.data;
  },
  deleteSubject: async (id: string): Promise<void> => {
    await apiClient.delete(`/subjects/${id}`);
  },

  bulkDeleteSubjects: async (
    ids: string[]
  ): Promise<{ deleted: number; failed: Array<{ id: string; reason: string }> }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { deleted: number; failed: Array<{ id: string; reason: string }> };
    }>('/subjects/bulk-delete', { ids });
    return res.data.data;
  },
};

export default subjectApi;
