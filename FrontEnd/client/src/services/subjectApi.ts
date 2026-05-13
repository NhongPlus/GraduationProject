import apiClient from './apiClient';

export interface SubjectDto {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

const subjectApi = {
  getSubjects: async (): Promise<SubjectDto[]> => {
    const res = await apiClient.get<{ success: boolean; data: SubjectDto[] }>('/subjects');
    return res.data.data;
  },
};

export default subjectApi;
