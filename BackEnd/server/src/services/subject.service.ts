import {
  createSubject,
  updateSubject,
  setSubjectPrerequisites,
  type CreateSubjectInput,
  type UpdateSubjectInput,
} from "~/models/subject.model";
import {
  attachPrerequisites,
  getSubjectDetailById,
  validatePrerequisiteIds,
  type SubjectDetail,
} from "~/services/subjectPrerequisite.service";
import { httpError } from "~/services/exam.service";

export async function createSubjectWithPrerequisites(
  input: CreateSubjectInput
): Promise<SubjectDetail> {
  const name = input.name?.trim();
  if (!name) throw httpError(400, "Tên môn học là bắt buộc");

  let prerequisiteIds: string[] = [];
  if (input.prerequisite_ids?.length) {
    prerequisiteIds = await validatePrerequisiteIds(input.prerequisite_ids);
  }

  const created = await createSubject({
    ...input,
    name,
    prerequisite_ids: prerequisiteIds,
  });
  return attachPrerequisites(created);
}

export async function updateSubjectWithPrerequisites(
  id: string,
  input: UpdateSubjectInput
): Promise<SubjectDetail | null> {
  if (input.prerequisite_ids !== undefined) {
    const validated = await validatePrerequisiteIds(input.prerequisite_ids, id);
    input = { ...input, prerequisite_ids: validated };
  }

  const updated = await updateSubject(id, input);
  if (!updated) return null;
  return attachPrerequisites(updated);
}

export async function replaceSubjectPrerequisites(
  id: string,
  prerequisiteIds: string[]
): Promise<SubjectDetail | null> {
  const validated = await validatePrerequisiteIds(prerequisiteIds, id);
  const updated = await setSubjectPrerequisites(id, validated);
  if (!updated) return null;
  return attachPrerequisites(updated);
}

export { getSubjectDetailById };
