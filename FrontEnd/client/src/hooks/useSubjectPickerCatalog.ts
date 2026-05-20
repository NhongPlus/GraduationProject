import { useEffect, useMemo, useState } from 'react';
import {
  catalogToPickerGroups,
  type SubjectPickerCatalogGroupDto,
} from '@/components/Input/SubjectCategoryPicker/predictionSubjectGrouping';
import type { SubjectCategoryGroup } from '@/components/Input/SubjectCategoryPicker/subjectGrouping';
import type { SubjectDto } from '@/services/subjectApi';
import { getSubjectPickerCatalog } from '@/services/subjectApi';

export function useSubjectPickerCatalog() {
  const [catalog, setCatalog] = useState<SubjectPickerCatalogGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void getSubjectPickerCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setError('Không tải được danh mục môn theo nhóm.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => catalogToPickerGroups(catalog), [catalog]);

  const subjects = useMemo(
    () => dedupeSubjectsById(groups.flatMap((g) => g.subjects)),
    [groups]
  );

  return { catalog, groups, subjects, loading, error };
}

function dedupeSubjectsById(list: SubjectDto[]): SubjectDto[] {
  const seen = new Set<string>();
  const out: SubjectDto[] = [];
  for (const s of list) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

export type { SubjectCategoryGroup };
