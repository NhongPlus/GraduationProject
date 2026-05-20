import pool from "~/config/db";
import { resolveSubjectId } from "~/utils/subjectGroups.util";

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SUB_CATEGORY_ORDER = [
  "math",
  "programming",
  "software_eng",
  "se",
  "mobile",
  "testing",
  "ai",
  "ml",
  "iot",
  "big_data",
  "data_eng",
  "network",
  "english",
  "national_defense",
  "philosophy",
  "politics",
  "soft_skills",
  "security",
  "internship",
  "capstone",
  "pe",
  "intro",
  "database",
  "systems",
];

const SUB_CATEGORY_LABELS: Record<string, string> = {
  math: "Đại số / Toán",
  programming: "Lập trình",
  software_eng: "Phần mềm",
  se: "Phần mềm",
  mobile: "Phần mềm",
  testing: "Phần mềm",
  ai: "Học máy & IoT",
  ml: "Học máy & IoT",
  iot: "Học máy & IoT",
  big_data: "BigData",
  data_eng: "BigData",
  network: "Network",
  english: "Tiếng Anh",
  national_defense: "Quốc phòng",
  philosophy: "Triết học & Chính trị",
  politics: "Triết học & Chính trị",
  soft_skills: "Kỹ năng mềm",
  security: "An toàn thông tin",
  internship: "Thực tập / Doanh nghiệp",
  capstone: "Thực tập / Đồ án",
  pe: "Thể chất",
  intro: "Nền tảng CNTT",
  database: "Cơ sở dữ liệu",
  systems: "Hệ thống",
  law: "Đại cương",
  history: "Đại cương",
  geo: "Kỹ năng / hỗ trợ",
  digital: "Kỹ năng / hỗ trợ",
  it_business: "Kỹ năng / hỗ trợ",
};

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

/** Catalog môn dự đoán — nhóm theo sub_category (admin chỉnh qua API môn học). */
export async function getPredictionSubjectCatalog(): Promise<PredictionCatalogGroup[]> {
  const r = await pool.query<{
    id: string;
    name: string;
    code: string;
    credits: number;
    sub_category: string | null;
    prerequisites: string[] | null;
  }>(
    `SELECT id, name, code, credits, sub_category, prerequisites
     FROM subjects
     WHERE is_active = true
     ORDER BY name ASC`
  );

  const allById = new Map(r.rows.map((row) => [row.id, row]));
  const bySub = new Map<string, PredictionCatalogSubject[]>();

  for (const row of r.rows) {
    const modelId = resolveSubjectId(row.name);
    if (!modelId) continue;

    const prereqIds = Array.isArray(row.prerequisites)
      ? row.prerequisites.filter((x): x is string => typeof x === "string")
      : [];
    const prereqNames = prereqIds
      .map((pid) => allById.get(pid)?.name)
      .filter((n): n is string => Boolean(n));

    const key = row.sub_category?.trim() || "other";
    const item: PredictionCatalogSubject = {
      id: row.id,
      name: row.name,
      code: row.code ?? "",
      credits: Number(row.credits) || 0,
      model_subject_id: modelId,
      prerequisite_ids: prereqIds,
      prerequisite_names: prereqNames,
    };
    const list = bySub.get(key) ?? [];
    list.push(item);
    bySub.set(key, list);
  }

  const groups: PredictionCatalogGroup[] = [];
  const used = new Set<string>();

  for (const key of SUB_CATEGORY_ORDER) {
    const items = bySub.get(key);
    if (!items?.length) continue;
    used.add(key);
    groups.push({
      id: key,
      label: SUB_CATEGORY_LABELS[key] ?? key,
      subjects: items.sort((a, b) => a.name.localeCompare(b.name, "vi")),
    });
  }

  for (const [key, items] of bySub.entries()) {
    if (used.has(key) || items.length === 0) continue;
    groups.push({
      id: key,
      label: SUB_CATEGORY_LABELS[key] ?? key,
      subjects: items.sort((a, b) => a.name.localeCompare(b.name, "vi")),
    });
  }

  return groups;
}
