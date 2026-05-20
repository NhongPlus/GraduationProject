import apiClient from './apiClient';

export interface ProgramDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  subject_count?: number;
}

export type CreateProgramPayload = {
  code: string;
  name: string;
  description?: string | null;
};

const programApi = {
  getPrograms: async (): Promise<ProgramDto[]> => {
    const res = await apiClient.get<{ success: boolean; data: ProgramDto[] }>('/programs');
    return res.data.data;
  },

  createProgram: async (payload: CreateProgramPayload): Promise<ProgramDto> => {
    const res = await apiClient.post<{ success: boolean; data: ProgramDto }>('/programs', payload);
    return res.data.data;
  },

  updateProgram: async (
    id: string,
    payload: Partial<CreateProgramPayload> & { is_active?: boolean }
  ): Promise<ProgramDto> => {
    const res = await apiClient.patch<{ success: boolean; data: ProgramDto }>(
      `/programs/${id}`,
      payload
    );
    return res.data.data;
  },

  deleteProgram: async (id: string): Promise<void> => {
    await apiClient.delete(`/programs/${id}`);
  },
};

export default programApi;
