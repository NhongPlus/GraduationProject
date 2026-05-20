import type { SubjectDto } from '@/services/subjectApi';
import type { SubjectCategoryGroup } from './subjectGrouping';

/** @deprecated Import từ subjectPickerApi — giữ alias type */
export type PredictionCatalogGroupDto = SubjectPickerCatalogGroupDto;

export type SubjectPickerCatalogGroupDto = {
  id: string;
  label: string;
  subjects: Array<{
    id: string;
    name: string;
    code: string;
    credits: number;
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
        semester: 0,
        category: g.id,
        is_active: true,
        created_at: '',
      })
    ),
  }));
}
