import { getSubjectPickerCatalog } from "~/services/predictionCatalog.service";
import { getSubjectGroupByProgramAndCode } from "~/models/subjectGroup.model";
import type { CreateSubjectInput, UpdateSubjectInput } from "~/models/subject.model";

/** UUID môn thuộc một nhóm catalog (subject_groups.json). */
export async function getSubjectIdsForCatalogGroup(
  catalogGroupId: string
): Promise<string[]> {
  const catalog = await getSubjectPickerCatalog();
  const group = catalog.find((g) => g.id === catalogGroupId);
  return group?.subjects.map((s) => s.id) ?? [];
}

/** Gắn subject_group_id DB theo mã nhóm catalog (pe, math, …). */
export async function linkSubjectToCatalogGroup<T extends CreateSubjectInput | UpdateSubjectInput>(
  input: T
): Promise<T> {
  const programId = input.program_id;
  const code = input.sub_category?.trim();
  if (!programId || !code) return input;
  const row = await getSubjectGroupByProgramAndCode(programId, code);
  if (!row) return input;
  return { ...input, subject_group_id: row.id };
}
