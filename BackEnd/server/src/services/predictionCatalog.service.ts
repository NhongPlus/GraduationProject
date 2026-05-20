import pool from "~/config/db";
import {
  loadGroupsFile,
  PREDICTION_GROUP_ORDER,
  resolveSubjectId,
} from "~/utils/subjectGroups.util";

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

/**
 * Catalog môn dự đoán — nhóm theo subject_groups.json (12 nhóm CNTT16-02).
 * Một môn có thể xuất hiện ở nhiều nhóm (vd. Lập trình cơ bản: Học máy & IoT + Phần mềm).
 */
/** Catalog nhóm môn cho mọi SubjectCategoryPicker (admin / GV / SV). */
export async function getSubjectPickerCatalog(): Promise<PredictionCatalogGroup[]> {
  const r = await pool.query<{
    id: string;
    name: string;
    code: string;
    credits: number;
    prerequisites: string[] | null;
  }>(
    `SELECT id, name, code, credits, prerequisites
     FROM subjects
     WHERE is_active = true
     ORDER BY name ASC`
  );

  const allById = new Map(r.rows.map((row) => [row.id, row]));
  const groupsFile = loadGroupsFile();
  const buckets = new Map<string, PredictionCatalogSubject[]>();

  for (const gid of PREDICTION_GROUP_ORDER) {
    if (groupsFile.groups[gid]) buckets.set(gid, []);
  }

  const ungrouped: PredictionCatalogSubject[] = [];

  for (const row of r.rows) {
    const modelId = resolveSubjectId(row.name);
    if (!modelId) continue;

    const prereqIds = Array.isArray(row.prerequisites)
      ? row.prerequisites.filter((x): x is string => typeof x === "string")
      : [];
    const prereqNames = prereqIds
      .map((pid) => allById.get(pid)?.name)
      .filter((n): n is string => Boolean(n));

    const item: PredictionCatalogSubject = {
      id: row.id,
      name: row.name,
      code: row.code ?? "",
      credits: Number(row.credits) || 0,
      model_subject_id: modelId,
      prerequisite_ids: prereqIds,
      prerequisite_names: prereqNames,
    };

    const memberOf: string[] = [];
    for (const [gid, g] of Object.entries(groupsFile.groups)) {
      if (g.subjects.includes(modelId)) memberOf.push(gid);
    }

    if (memberOf.length === 0) {
      ungrouped.push(item);
      continue;
    }

    for (const gid of memberOf) {
      const list = buckets.get(gid);
      if (!list) continue;
      if (!list.some((s) => s.id === item.id)) list.push(item);
    }
  }

  const groups: PredictionCatalogGroup[] = [];

  for (const gid of PREDICTION_GROUP_ORDER) {
    const meta = groupsFile.groups[gid];
    const items = buckets.get(gid);
    if (!meta || !items?.length) continue;
    groups.push({
      id: gid,
      label: meta.label,
      subjects: items.sort((a, b) => a.name.localeCompare(b.name, "vi")),
    });
  }

  for (const [gid, g] of Object.entries(groupsFile.groups)) {
    if ((PREDICTION_GROUP_ORDER as readonly string[]).includes(gid)) continue;
    const items = buckets.get(gid);
    if (!items?.length) continue;
    groups.push({
      id: gid,
      label: g.label,
      subjects: items.sort((a, b) => a.name.localeCompare(b.name, "vi")),
    });
  }

  if (ungrouped.length > 0) {
    groups.push({
      id: "other",
      label: "Khác (chưa gán nhóm)",
      subjects: ungrouped.sort((a, b) => a.name.localeCompare(b.name, "vi")),
    });
  }

  return groups;
}

/** @deprecated Dùng getSubjectPickerCatalog — giữ alias cho route /prediction/subject-catalog */
export const getPredictionSubjectCatalog = getSubjectPickerCatalog;
