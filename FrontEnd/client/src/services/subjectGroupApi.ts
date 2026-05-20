import apiClient from './apiClient';

export interface SubjectGroupDto {
  id: string;
  program_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  subject_count?: number;
}

const subjectGroupApi = {
  listByProgram: async (programId: string): Promise<SubjectGroupDto[]> => {
    const res = await apiClient.get<{ success: boolean; data: SubjectGroupDto[] }>(
      '/subject-groups',
      { params: { program_id: programId } }
    );
    return res.data.data;
  },

  create: async (payload: {
    program_id: string;
    code: string;
    name: string;
    description?: string | null;
    sort_order?: number;
  }): Promise<SubjectGroupDto> => {
    const res = await apiClient.post<{ success: boolean; data: SubjectGroupDto }>(
      '/subject-groups',
      payload
    );
    return res.data.data;
  },

  update: async (
    id: string,
    payload: Partial<{
      code: string;
      name: string;
      description: string | null;
      sort_order: number;
      is_active: boolean;
    }>
  ): Promise<SubjectGroupDto> => {
    const res = await apiClient.patch<{ success: boolean; data: SubjectGroupDto }>(
      `/subject-groups/${id}`,
      payload
    );
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/subject-groups/${id}`);
  },
};

export default subjectGroupApi;
