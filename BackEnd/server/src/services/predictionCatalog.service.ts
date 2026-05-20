import pool from "~/config/db";
import { getSubjectGroupsByProgram } from "~/models/subjectGroup.model";
import { resolveSubjectId } from "~/utils/subjectGroups.util";

export type PredictionCatalogSubject = {
  id: string;
  name: string;
  code: string;
  credits: number;
  model_subject_id: string | null;
  prerequisite_ids: string[];
  prerequisite_names: string[];
};

export type PredictionCatalogGroup = {
  id: string;
  label: string;
  subjects: PredictionCatalogSubject[];
};

async function getDefaultProgramId(): Promise<string | null> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM programs WHERE code = 'CNTT' LIMIT 1`
  );
  return r.rows[0]?.id ?? null;
}

function toCatalogSubject(
  row: {
    id: string;
    name: string;
    code: string;
    credits: number;
    prerequisites: string[] | null;
  },
  allById: Map<string, { name: string }>
): PredictionCatalogSubject {
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
    model_subject_id: resolveSubjectId(row.name),
    prerequisite_ids: prereqIds,
    prerequisite_names: prereqNames,
  };
}

/** Catalog từ DB — đồng bộ với CRUD admin (subject_groups). */
export async function getSubjectPickerCatalog(): Promise<PredictionCatalogGroup[]> {
  const programId = await getDefaultProgramId();
  const r = await pool.query<{
    id: string;
    name: string;
    code: string;
    credits: number;
    prerequisites: string[] | null;
    subject_group_id: string | null;
    sub_category: string | null;
    program_id: string | null;
  }>(
    `SELECT id, name, code, credits, prerequisites, subject_group_id, sub_category, program_id
     FROM subjects WHERE is_active = true ORDER BY name ASC`
  );

  const allById = new Map(r.rows.map((row) => [row.id, { name: row.name }]));
  const dbGroups = programId ? await getSubjectGroupsByProgram(programId) : [];
  const buckets = new Map<string, PredictionCatalogSubject[]>();
  for (const g of dbGroups) buckets.set(g.id, []);

  const ungrouped: PredictionCatalogSubject[] = [];

  for (const row of r.rows) {
    if (programId && row.program_id && row.program_id !== programId) continue;
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

  const groups: PredictionCatalogGroup[] = dbGroups
    .map((g) => ({
      id: g.id,
      label: g.name,
      subjects: (buckets.get(g.id) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "vi")
      ),
    }))
    .filter((g) => g.subjects.length > 0);

  if (ungrouped.length > 0) {
    groups.push({
      id: "other",
      label: "Chưa gán nhóm",
      subjects: ungrouped.sort((a, b) => a.name.localeCompare(b.name, "vi")),
    });
  }

  return groups;
}
