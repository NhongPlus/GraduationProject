import apiClient from './apiClient';
import subjectApi, { getSubjectCatalog, type SubjectCatalogGroup } from './subjectApi';

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

function catalogGroupToDto(g: SubjectCatalogGroup, programId: string): SubjectGroupDto {
  return {
    id: g.id,
    program_id: programId,
    code: g.code,
    name: g.name,
    description: g.description,
    sort_order: g.sort_order,
    is_active: true,
    created_at: '',
    subject_count: g.subject_count,
  };
}

/** Ghi CRUD nhóm; đọc danh sách qua GET /subjects/catalog (đồng bộ). */
const subjectGroupApi = {
  /** @deprecated Đọc qua subjectApi.getCatalog — giữ để tương thích */
  listByProgram: async (programId: string): Promise<SubjectGroupDto[]> => {
    const catalog = await getSubjectCatalog(programId);
    return catalog.groups
      .filter((g) => g.id !== 'other')
      .map((g) => catalogGroupToDto(g, catalog.program_id));
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
    subjectApi.resetCatalogCache(payload.program_id);
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
    }>,
    programId?: string
  ): Promise<SubjectGroupDto> => {
    const res = await apiClient.patch<{ success: boolean; data: SubjectGroupDto }>(
      `/subject-groups/${id}`,
      payload
    );
    if (programId) subjectApi.resetCatalogCache(programId);
    else subjectApi.resetCatalogCache();
    return res.data.data;
  },

  delete: async (id: string, programId?: string): Promise<void> => {
    await apiClient.delete(`/subject-groups/${id}`);
    if (programId) subjectApi.resetCatalogCache(programId);
    else subjectApi.resetCatalogCache();
  },
};

export default subjectGroupApi;
