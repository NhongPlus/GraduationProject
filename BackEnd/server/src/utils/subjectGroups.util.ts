import fs from "node:fs";
import path from "node:path";

export interface SubjectGroupsFile {
  version: string;
  groups: Record<
    string,
    {
      label: string;
      subjects: string[];
      ordered?: boolean;
      rule?: string;
      paths?: Array<{ name: string; required: string[] }>;
    }
  >;
}

export interface SubjectNameEntry {
  id: string;
  name: string;
}

let groupsCache: SubjectGroupsFile | null = null;
let nameToIdCache: Map<string, string> | null = null;

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function loadGroupsFile(): SubjectGroupsFile {
  if (groupsCache) return groupsCache;
  const candidates = [
    path.resolve(__dirname, "../data/subject_groups.json"),
    path.resolve(__dirname, "../../src/data/subject_groups.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      groupsCache = JSON.parse(fs.readFileSync(p, "utf-8")) as SubjectGroupsFile;
      return groupsCache;
    }
  }
  throw new Error("subject_groups.json không tìm thấy");
}

/** Nạp map tên môn → Sxx từ model_weights.json */
export function loadSubjectNameIndex(): Map<string, string> {
  if (nameToIdCache) return nameToIdCache;
  const candidates = [
    path.resolve(__dirname, "../data/model_weights.json"),
    path.resolve(__dirname, "../../src/data/model_weights.json"),
  ];
  let raw: { subject_meta: Record<string, { name: string }> } | null = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      raw = JSON.parse(fs.readFileSync(p, "utf-8"));
      break;
    }
  }
  const map = new Map<string, string>();
  if (raw?.subject_meta) {
    for (const [id, meta] of Object.entries(raw.subject_meta)) {
      map.set(normalizeName(meta.name), id);
      map.set(normalizeName(id), id);
    }
  }
  nameToIdCache = map;
  return map;
}

export function resolveSubjectId(subjectLabel: string): string | null {
  const map = loadSubjectNameIndex();
  const n = normalizeName(subjectLabel);
  if (map.has(n)) return map.get(n)!;
  for (const [key, id] of map.entries()) {
    if (n.includes(key) || key.includes(n)) return id;
  }
  return null;
}

export function getSubjectName(subjectId: string): string | null {
  const candidates = [
    path.resolve(__dirname, "../data/model_weights.json"),
    path.resolve(__dirname, "../../src/data/model_weights.json"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const raw = JSON.parse(fs.readFileSync(p, "utf-8")) as {
      subject_meta: Record<string, { name: string }>;
    };
    return raw.subject_meta[subjectId]?.name ?? null;
  }
  return null;
}

/** Các nhóm chứa môn vừa thi */
export function getGroupsForSubject(subjectLabel: string): string[] {
  const sid = resolveSubjectId(subjectLabel);
  if (!sid) return [];
  const groups = loadGroupsFile();
  const out: string[] = [];
  for (const [gid, g] of Object.entries(groups.groups)) {
    if (g.subjects.includes(sid)) out.push(gid);
  }
  return out;
}

function historyHasSubject(
  completedNames: Set<string>,
  subjectId: string
): boolean {
  const name = getSubjectName(subjectId);
  if (!name) return false;
  const n = normalizeName(name);
  for (const h of completedNames) {
    if (normalizeName(h) === n) return true;
    if (normalizeName(h).includes(n) || n.includes(normalizeName(h))) return true;
  }
  return false;
}

/** Môn tiếp theo trong nhóm có thứ tự (Tiếng Anh, Quốc phòng, Kỹ năng mềm). */
function nextOrderedInGroup(
  groupId: string,
  justCompletedId: string
): string[] {
  const g = loadGroupsFile().groups[groupId];
  if (!g?.ordered || !g.subjects.length) return [];
  const idx = g.subjects.indexOf(justCompletedId);
  if (idx < 0 || idx >= g.subjects.length - 1) return [];
  return [g.subjects[idx + 1]];
}

const MAX_TARGETS = 6;

/**
 * Chọn môn được phép dự đoán sau khi SV vừa hoàn thành một môn.
 * Quy tắc: chỉ môn thuộc CÙNG NHÓM (subject_groups.json), chưa có trong lịch sử.
 * Nhóm ordered: chỉ môn KẾ TIẾP trong chuỗi (P1→P2), không nhảy xa.
 */
export function getPredictionTargets(
  justCompletedSubject: string,
  completedSubjectNames: string[] = []
): { targets: string[]; groupLabels: string[]; completedId: string | null } {
  const completedSet = new Set(completedSubjectNames);
  completedSet.add(justCompletedSubject);

  const completedId = resolveSubjectId(justCompletedSubject);
  const groupIds = getGroupsForSubject(justCompletedSubject);

  if (!completedId || groupIds.length === 0) {
    return { targets: [], groupLabels: [], completedId };
  }

  const groups = loadGroupsFile();
  const targetIds = new Set<string>();
  const labels: string[] = [];

  for (const gid of groupIds) {
    const g = groups.groups[gid];
    if (!g) continue;
    labels.push(g.label);

    if (g.ordered) {
      for (const nid of nextOrderedInGroup(gid, completedId)) {
        if (!historyHasSubject(completedSet, nid)) targetIds.add(nid);
      }
      continue;
    }

    for (const sid of g.subjects) {
      if (sid === completedId) continue;
      if (historyHasSubject(completedSet, sid)) continue;
      targetIds.add(sid);
    }
  }

  const targets = [...targetIds]
    .map((id) => getSubjectName(id))
    .filter((n): n is string => Boolean(n))
    .slice(0, MAX_TARGETS);

  return {
    targets,
    groupLabels: [...new Set(labels)],
    completedId,
  };
}

export function resetSubjectGroupsCache(): void {
  groupsCache = null;
  nameToIdCache = null;
}
