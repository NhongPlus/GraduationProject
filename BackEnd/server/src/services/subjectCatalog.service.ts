import pool from "~/config/db";
import { getSubjectGroupsByProgram } from "~/models/subjectGroup.model";
import { resolveSubjectId } from "~/utils/subjectGroups.util";

export type GroupScope = "base" | "shared" | "catalog";

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
  /** Gán trực tiếp vào ngành (không qua nhóm) */
  assigned_direct?: boolean;
};

export type CatalogGroup = {
  id: string;
  code: string;
  name: string;
  label: string;
  description: string | null;
  sort_order: number;
  subject_count: number;
  group_scope: GroupScope;
  /** Nhóm base: tự có trong mọi CTĐT */
  is_inherited_base: boolean;
  /** Ngành đã gán nhóm này */
  is_assigned: boolean;
  subjects: CatalogSubject[];
};

export type SubjectCatalogResponse = {
  program_id: string;
  groups: CatalogGroup[];
};

export type WarehouseGroup = CatalogGroup & { subject_count_total: number };
export type WarehouseCatalogResponse = {
  groups: WarehouseGroup[];
  total_subjects: number;
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
    assigned_direct?: boolean;
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
    assigned_direct: row.assigned_direct,
  };
}

/** Môn thuộc chương trình ngành (kế thừa base + gán nhóm + gán lẻ) */
function programSubjectFilterSql(programIdParam: string): string {
  return `
    s.is_active = true
    AND (
      sg.group_scope = 'base'
      OR psg.program_id = ${programIdParam}
      OR ps.program_id = ${programIdParam}
    )
  `;
}

/** CTĐT một ngành — nhóm + môn đã gán / kế thừa base */
export async function getSubjectCatalog(
  programId?: string,
  options?: { hideEmptyGroups?: boolean }
): Promise<SubjectCatalogResponse> {
  const resolvedProgramId = await resolveProgramId(programId);

  const assignedRes = await pool.query<{ subject_group_id: string }>(
    `SELECT subject_group_id FROM program_subject_groups WHERE program_id = $1`,
    [resolvedProgramId]
  );
  const assignedGroupIds = new Set(assignedRes.rows.map((r) => r.subject_group_id));

  const dbGroups = await getSubjectGroupsByProgram(resolvedProgramId);

  const subjectSql = `
    SELECT s.id, s.name, s.code, s.credits, s.semester, s.category, s.sub_category,
           s.prerequisites, s.subject_group_id,
           (ps.program_id IS NOT NULL) AS assigned_direct
    FROM subjects s
    LEFT JOIN subject_groups sg ON sg.id = s.subject_group_id
    LEFT JOIN program_subject_groups psg
      ON psg.subject_group_id = sg.id AND psg.program_id = $1
    LEFT JOIN program_subjects ps ON ps.subject_id = s.id AND ps.program_id = $1
    WHERE ${programSubjectFilterSql("$1")}
    ORDER BY s.semester ASC, s.name ASC
  `;
  const r = await pool.query(subjectSql, [resolvedProgramId]);

  const allById = new Map(r.rows.map((row) => [row.id, { name: row.name }]));
  const buckets = new Map<string, CatalogSubject[]>();
  for (const g of dbGroups) buckets.set(g.id, []);

  const ungrouped: CatalogSubject[] = [];

  for (const row of r.rows) {
    const item = toCatalogSubject(row, allById);

    if (row.subject_group_id) {
      if (buckets.has(row.subject_group_id)) {
        const list = buckets.get(row.subject_group_id)!;
        if (!list.some((s) => s.id === item.id)) list.push(item);
      }
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
    const scope = (g as { group_scope?: GroupScope }).group_scope ?? "catalog";
    const isBase = scope === "base";
    const isAssigned = isBase || assignedGroupIds.has(g.id);
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
      group_scope: scope,
      is_inherited_base: isBase,
      is_assigned: isAssigned,
      subjects,
    };
  });

  if (ungrouped.length > 0) {
    groups.push({
      id: "other",
      code: "other",
      name: "Chưa gán nhóm / môn lẻ",
      label: "Chưa gán nhóm / môn lẻ",
      description: null,
      sort_order: 9999,
      subject_count: ungrouped.length,
      group_scope: "catalog",
      is_inherited_base: false,
      is_assigned: true,
      subjects: ungrouped.sort((a, b) => a.name.localeCompare(b.name, "vi")),
    });
  }

  const filtered = options?.hideEmptyGroups
    ? groups.filter((g) => g.subjects.length > 0)
    : groups;

  return { program_id: resolvedProgramId, groups: filtered };
}

/** Kho trường — toàn bộ nhóm + môn (admin quản lý master) */
export async function getSubjectWarehouseCatalog(): Promise<WarehouseCatalogResponse> {
  const groupsRes = await pool.query<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    sort_order: number;
    group_scope: GroupScope;
  }>(
    `SELECT id, code, name, description, sort_order, group_scope
     FROM subject_groups
     WHERE is_active = true
     ORDER BY sort_order ASC, name ASC`
  );

  const subjectsRes = await pool.query<{
    id: string;
    name: string;
    code: string;
    credits: number;
    semester: number;
    category: string;
    sub_category: string | null;
    prerequisites: string[] | null;
    subject_group_id: string | null;
  }>(
    `SELECT id, name, code, credits, semester, category, sub_category, prerequisites, subject_group_id
     FROM subjects
     WHERE is_active = true
     ORDER BY semester ASC, name ASC`
  );

  const allById = new Map(subjectsRes.rows.map((row) => [row.id, { name: row.name }]));
  const buckets = new Map<string, CatalogSubject[]>();
  for (const g of groupsRes.rows) buckets.set(g.id, []);

  const ungrouped: CatalogSubject[] = [];
  for (const row of subjectsRes.rows) {
    const item = toCatalogSubject(row, allById);
    if (row.subject_group_id && buckets.has(row.subject_group_id)) {
      buckets.get(row.subject_group_id)!.push(item);
    } else {
      ungrouped.push(item);
    }
  }

  const groups: WarehouseGroup[] = groupsRes.rows.map((g) => {
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
      subject_count_total: subjects.length,
      group_scope: g.group_scope,
      is_inherited_base: g.group_scope === "base",
      is_assigned: false,
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
      subject_count_total: ungrouped.length,
      group_scope: "catalog",
      is_inherited_base: false,
      is_assigned: false,
      subjects: ungrouped,
    });
  }

  return {
    groups,
    total_subjects: subjectsRes.rows.length,
  };
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
