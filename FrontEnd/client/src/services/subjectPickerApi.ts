import apiClient from './apiClient';

/** Nhóm môn + danh sách môn — nguồn thống nhất từ GET /subjects/picker-catalog */
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

let catalogPromise: Promise<SubjectPickerCatalogGroup[]> | null = null;

export function resetSubjectPickerCatalogCache(): void {
  catalogPromise = null;
}

export async function getSubjectPickerCatalog(
  options?: { refresh?: boolean }
): Promise<SubjectPickerCatalogGroup[]> {
  if (options?.refresh) catalogPromise = null;
  if (!catalogPromise) {
    catalogPromise = apiClient
      .get<{ success: boolean; data: SubjectPickerCatalogGroup[] }>('/subjects/picker-catalog')
      .then((res) => res.data.data)
      .catch((err) => {
        catalogPromise = null;
        throw err;
      });
  }
  return catalogPromise;
}

const subjectPickerApi = {
  getCatalog: getSubjectPickerCatalog,
  resetCache: resetSubjectPickerCatalogCache,
};

export default subjectPickerApi;
