import pool from "~/config/db";
import { getSubjectGroupsByProgram } from "~/models/subjectGroup.model";
import { resolveSubjectId } from "~/utils/subjectGroups.util";

export type CatalogSubject = {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  sub_category: string | null;
  subject_group_id: string | null;
  model_subject_id: string | null;
  prerequisite_ids: string[];
  prerequisite_names: string[];
};

export type CatalogGroup = {
  id: string;
  code: string;
  name: string;
  /** Tương thích picker cũ */
  label: string;
  description: string | null;
  sort_order: number;
  subject_count: number;
  subjects: CatalogSubject[];
};

export type SubjectCatalogResponse = {
  program_id: string;
  groups: CatalogGroup[];
};

export async function getDefaultProgramId(): Promise<string | null> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM programs WHERE code = 'CNTT' LIMIT 1`
  );
  return r.rows[0]?.id ?? null;
}

async function resolveProgramId(programId?: string): Promise<string> {
  const trimmed = programId?.trim();
  if (trimmed) {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM programs WHERE id = $1 LIMIT 1`,
      [trimmed]
    );
    if (r.rows[0]?.id) return r.rows[0].id;
    throw Object.assign(new Error("Không tìm thấy chuyên ngành"), { status: 404 });
  }
  const defaultId = await getDefaultProgramId();
  if (!defaultId) {
    throw Object.assign(new Error("Chưa cấu hình chương trình mặc định (CNTT)"), { status: 400 });
  }
  return defaultId;
}

function toCatalogSubject(
  row: {
    id: string;
    name: string;
    code: string;
    credits: number;
    semester: number;
    category: string;
    sub_category: string | null;
    subject_group_id: string | null;
    prerequisites: string[] | null;
  },
  allById: Map<string, { name: string }>
): CatalogSubject {
  const prereqIds = Array.isArray(row.prerequisites)
    ? row.prerequisites.filter((x): x is string => typeof x === "string")
    : [];
  const prereqNames = prereqIds
    .map((pid) => allById.get(pid)?.name)
    .filter((n): n is string => Boolean(n));
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? "",
    credits: Number(row.credits) || 0,
    semester: Number(row.semester) || 0,
    category: row.category ?? "general",
    sub_category: row.sub_category,
    subject_group_id: row.subject_group_id,
    model_subject_id: resolveSubjectId(row.name),
    prerequisite_ids: prereqIds,
    prerequisite_names: prereqNames,
  };
}

/** Một nguồn đọc: nhóm môn + môn theo chuyên ngành (admin, picker, dự đoán). */
export async function getSubjectCatalog(
  programId?: string,
  options?: { hideEmptyGroups?: boolean }
): Promise<SubjectCatalogResponse> {
  const resolvedProgramId = await resolveProgramId(programId);
  const dbGroups = await getSubjectGroupsByProgram(resolvedProgramId);

  const r = await pool.query<{
    id: string;
    name: string;
    code: string;
    credits: number;
    semester: number;
    category: string;
    sub_category: string | null;
    prerequisites: string[] | null;
    subject_group_id: string | null;
    program_id: string | null;
  }>(
    `SELECT id, name, code, credits, semester, category, sub_category, prerequisites, subject_group_id, program_id
     FROM subjects
     WHERE is_active = true AND program_id = $1
     ORDER BY semester ASC, name ASC`,
    [resolvedProgramId]
  );

  const allById = new Map(r.rows.map((row) => [row.id, { name: row.name }]));
  const buckets = new Map<string, CatalogSubject[]>();
  for (const g of dbGroups) buckets.set(g.id, []);

  const ungrouped: CatalogSubject[] = [];

  for (const row of r.rows) {
    const item = toCatalogSubject(row, allById);

    if (row.subject_group_id && buckets.has(row.subject_group_id)) {
      const list = buckets.get(row.subject_group_id)!;
      if (!list.some((s) => s.id === item.id)) list.push(item);
      continue;
    }

    const byCode = row.sub_category
      ? dbGroups.find((g) => g.code === row.sub_category)
      : null;
    if (byCode && buckets.has(byCode.id)) {
      const list = buckets.get(byCode.id)!;
      if (!list.some((s) => s.id === item.id)) list.push(item);
      continue;
    }

    ungrouped.push(item);
  }

  const groups: CatalogGroup[] = dbGroups.map((g) => {
    const subjects = (buckets.get(g.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "vi")
    );
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      label: g.name,
      description: g.description,
      sort_order: g.sort_order,
      subject_count: subjects.length,
      subjects,
    };
  });

  if (ungrouped.length > 0) {
    groups.push({
      id: "other",
      code: "other",
      name: "Chưa gán nhóm",
      label: "Chưa gán nhóm",
      description: null,
      sort_order: 9999,
      subject_count: ungrouped.length,
      subjects: ungrouped.sort((a, b) => a.name.localeCompare(b.name, "vi")),
    });
  }

  const filtered = options?.hideEmptyGroups
    ? groups.filter((g) => g.subjects.length > 0)
    : groups;

  return { program_id: resolvedProgramId, groups: filtered };
}

/** @deprecated Dùng getSubjectCatalog — giữ cho import cũ */
export async function getSubjectPickerCatalog(programId?: string) {
  const catalog = await getSubjectCatalog(programId, { hideEmptyGroups: true });
  return catalog.groups.map((g) => ({
    id: g.id,
    label: g.label,
    subjects: g.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      credits: s.credits,
      model_subject_id: s.model_subject_id,
      prerequisite_ids: s.prerequisite_ids,
      prerequisite_names: s.prerequisite_names,
    })),
  }));
}
