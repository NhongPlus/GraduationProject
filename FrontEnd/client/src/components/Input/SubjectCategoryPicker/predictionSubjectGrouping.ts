import type { SubjectDto } from '@/services/subjectApi';
import type { SubjectCategoryGroup } from './subjectGrouping';

/** Alias type — nguồn dữ liệu: subjectApi.getSubjectPickerCatalog */
export type PredictionCatalogGroupDto = SubjectPickerCatalogGroupDto;

export type SubjectPickerCatalogGroupDto = {
  id: string;
  label: string;
  subjects: Array<{
    id: string;
    name: string;
    code: string;
    credits: number;
    semester: number;
    model_subject_id: string | null;
  }>;
};

export function catalogToPickerGroups(
  catalog: PredictionCatalogGroupDto[]
): SubjectCategoryGroup[] {
  return catalog.map((g) => ({
    category: g.id,
    label: g.label,
    subjects: g.subjects.map(
      (s): SubjectDto => ({
        id: s.id,
        name: s.name,
        code: s.code,
        credits: s.credits,
        semester: s.semester,
        category: g.id,
        is_active: true,
        created_at: '',
      })
    ),
  }));
}
