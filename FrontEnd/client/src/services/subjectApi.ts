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
  subject_group_id?: string | null;
  program_id?: string | null;
  prerequisites?: SubjectPrerequisiteRef[];
  prerequisite_ids?: string[];
  is_active: boolean;
  created_at: string;
}

export type SubjectImportPreviewRow = {
  row: number;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  status: 'ok' | 'error';
  message: string;
};

export type SubjectImportConfirmRow = {
  name: string;
  code?: string;
  credits?: number;
  semester?: number;
  category?: string;
};

export type CreateSubjectPayload = {
  name: string;
  code?: string;
  credits?: number;
  semester?: number;
  category?: string;
  sub_category?: string | null;
  subject_group_id?: string | null;
  prerequisite_ids?: string[];
  program_id?: string | null;
};

/** Môn trong catalog thống nhất */
export type SubjectCatalogSubject = {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  sub_category: string | null;
  subject_group_id: string | null;
  model_subject_id: string | null;
  prerequisite_ids?: string[];
  prerequisite_names?: string[];
};

/** Nhóm môn + môn — GET /subjects/catalog */
export type SubjectCatalogGroup = {
  id: string;
  code: string;
  name: string;
  label: string;
  description: string | null;
  sort_order: number;
  subject_count: number;
  subjects: SubjectCatalogSubject[];
};

export type SubjectCatalogResponse = {
  program_id: string;
  groups: SubjectCatalogGroup[];
};

/** @deprecated Dùng SubjectCatalogGroup — tương thích picker */
export type SubjectPickerCatalogGroup = {
  id: string;
  label: string;
  subjects: Array<{
    id: string;
    name: string;
    code: string;
    credits: number;
    model_subject_id: string | null;
    prerequisite_ids?: string[];
    prerequisite_names?: string[];
  }>;
};

const catalogCache = new Map<string, Promise<SubjectCatalogResponse>>();

export function resetSubjectCatalogCache(programId?: string): void {
  if (programId) catalogCache.delete(programId);
  else catalogCache.clear();
}

/** @deprecated */
export function resetSubjectPickerCatalogCache(): void {
  resetSubjectCatalogCache();
}

/** Một API đọc: nhóm + môn theo chuyên ngành */
export async function getSubjectCatalog(
  programId: string,
  options?: { refresh?: boolean; hideEmptyGroups?: boolean }
): Promise<SubjectCatalogResponse> {
  if (options?.refresh) catalogCache.delete(programId);
  const cacheKey = `${programId}:${options?.hideEmptyGroups ? '1' : '0'}`;
  if (!catalogCache.has(cacheKey)) {
    catalogCache.set(
      cacheKey,
      apiClient
        .get<{ success: boolean; data: SubjectCatalogResponse }>('/subjects/catalog', {
          params: {
            program_id: programId,
            hide_empty: options?.hideEmptyGroups ? 'true' : undefined,
          },
        })
        .then((res) => res.data.data)
        .catch((err) => {
          catalogCache.delete(cacheKey);
          throw err;
        })
    );
  }
  return catalogCache.get(cacheKey)!;
}

/** Picker / dự đoán — alias catalog (ẩn nhóm trống, mặc định CNTT nếu không truyền program) */
export async function getSubjectPickerCatalog(
  options?: { refresh?: boolean; programId?: string }
): Promise<SubjectPickerCatalogGroup[]> {
  const res = await apiClient.get<{ success: boolean; data: SubjectPickerCatalogGroup[] }>(
    '/subjects/picker-catalog',
    {
      params: options?.programId ? { program_id: options.programId } : undefined,
    }
  );
  if (options?.refresh) {
    resetSubjectCatalogCache(options.programId);
  }
  return res.data.data;
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
  listSubjects: async (
    params: ListQueryParams & {
      program_id?: string;
      sub_category?: string;
      subject_group_id?: string;
      /** Mã nhóm từ GET /subjects/picker-catalog (pe, math, ai_iot, …) */
      catalog_group?: string;
    } = {}
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

  downloadImportTemplate: async (): Promise<Blob> => {
    const res = await apiClient.get('/subjects/import-template', { responseType: 'blob' });
    return res.data as Blob;
  },

  importPreview: async (
    programId: string,
    subjectGroupId: string,
    file: File
  ): Promise<SubjectImportPreviewRow[]> => {
    const form = new FormData();
    form.append('file', file);
    form.append('program_id', programId);
    form.append('subject_group_id', subjectGroupId);
    const res = await apiClient.post<{ success: boolean; data: { rows: SubjectImportPreviewRow[] } }>(
      '/subjects/import/preview',
      form
    );
    return res.data.data.rows;
  },

  importConfirm: async (
    programId: string,
    subjectGroupId: string,
    rows: SubjectImportConfirmRow[]
  ): Promise<{ created: number; failed: Array<{ name: string; reason: string }> }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { created: number; failed: Array<{ name: string; reason: string }> };
    }>('/subjects/import/confirm', {
      program_id: programId,
      subject_group_id: subjectGroupId,
      rows,
    });
    return res.data.data;
  },

  getCatalog: getSubjectCatalog,
  getPickerCatalog: getSubjectPickerCatalog,
  resetCatalogCache: resetSubjectCatalogCache,
  resetPickerCatalogCache: resetSubjectPickerCatalogCache,
};

export default subjectApi;
