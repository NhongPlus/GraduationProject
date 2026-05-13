import pool from "~/config/db";

export interface ExamVersion {
  id: string;
  exam_id: string;
  version_code: string;        // "D01"
  version_index: number;       // 0-based
  question_order: string[];   // [q3_id, q1_id, q2_id] — shuffled order
  option_maps: Record<string, Record<string, string>>; // { q_id: { A→B, B→A, ... } }
  created_at: string;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Deterministic version assignment: same student_id + exam_id → same version */
export function assignVersionIndex(studentId: string, totalVersions: number): number {
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    hash = ((hash << 5) - hash) + studentId.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % totalVersions;
}

/** Given shuffled answer (A/B/C/D) and option_map, return original answer */
export function reverseAnswer(
  shuffledAnswer: string,
  optionMap: Record<string, string>
): string {
  // optionMap: { "A": "B", "B": "D", "C": "A", "D": "C" }
  // means student's "A" corresponds to original "B"
  // To reverse: find which original key maps to the student's choice
  for (const [shuffled, original] of Object.entries(optionMap)) {
    if (shuffled === shuffledAnswer) return original;
  }
  return shuffledAnswer;
}

/** Given a student's submitted answers (keyed by shuffled question display order index),
 *  and the version's question_order + option_maps, return answers keyed by original question_id */
export function unshuffleAnswers(
  studentAnswers: Record<string, string | string[]>, // { "0": "A", "1": "B" } (display idx → answer)
  questionOrder: string[],                            // [q3_id, q1_id, q2_id]
  optionMaps: Record<string, Record<string, string>>  // { q_id: { A→B, ... } }
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const [displayIdx, answer] of Object.entries(studentAnswers)) {
    const questionId = questionOrder[parseInt(displayIdx)];
    if (!questionId) continue;

    const qMap = optionMaps[questionId];
    if (qMap) {
      if (Array.isArray(answer)) {
        result[questionId] = answer.map((a) => reverseAnswer(a, qMap));
      } else {
        result[questionId] = reverseAnswer(answer, qMap);
      }
    } else {
      result[questionId] = answer;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// queries
// ---------------------------------------------------------------------------

export const createVersion = async (
  examId: string,
  versionCode: string,
  versionIndex: number,
  questionOrder: string[],
  optionMaps: Record<string, Record<string, string>>
): Promise<ExamVersion> => {
  const result = await pool.query(
    `INSERT INTO exam_versions (exam_id, version_code, version_index, question_order, option_maps)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb) RETURNING *`,
    [examId, versionCode, versionIndex, JSON.stringify(questionOrder), JSON.stringify(optionMaps)]
  );
  return result.rows[0] as ExamVersion;
};

export const getVersionsByExam = async (examId: string): Promise<ExamVersion[]> => {
  const result = await pool.query(
    `SELECT * FROM exam_versions WHERE exam_id = $1 ORDER BY version_index ASC`,
    [examId]
  );
  return result.rows as ExamVersion[];
};

export const getVersionByIndex = async (
  examId: string,
  index: number
): Promise<ExamVersion | null> => {
  const result = await pool.query(
    `SELECT * FROM exam_versions WHERE exam_id = $1 AND version_index = $2`,
    [examId, index]
  );
  return (result.rows[0] as ExamVersion) ?? null;
};

export const getVersionByCode = async (
  examId: string,
  code: string
): Promise<ExamVersion | null> => {
  const result = await pool.query(
    `SELECT * FROM exam_versions WHERE exam_id = $1 AND version_code = $2`,
    [examId, code]
  );
  return (result.rows[0] as ExamVersion) ?? null;
};

/** Generate all version permutations for an exam */
export function generateVersionPool(
  questionIds: string[],
  questionOptions: Record<string, Record<string, string>>, // q_id → { A: "original", B: "original", ... }
  numVersions: number
): Array<{
  versionIndex: number;
  versionCode: string;
  questionOrder: string[];
  optionMaps: Record<string, Record<string, string>>;
}> {
  const pool: Array<{
    versionIndex: number;
    versionCode: string;
    questionOrder: string[];
    optionMaps: Record<string, Record<string, string>>;
  }> = [];

  for (let v = 0; v < numVersions; v++) {
    // Fisher-Yates shuffle with seeded-ish determinism per version
    const qOrder = shuffleArray([...questionIds], v);

    const optMaps: Record<string, Record<string, string>> = {};
    for (const qId of questionIds) {
      optMaps[qId] = shuffleOptions(questionOptions[qId] ?? { A: "A", B: "B", C: "C", D: "D" }, v + qId.charCodeAt(0));
    }

    pool.push({
      versionIndex: v,
      versionCode: `D${String(v + 1).padStart(2, "0")}`,
      questionOrder: qOrder,
      optionMaps: optMaps,
    });
  }
  return pool;
}

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.abs((seed * (i + 1) * 9301 + 49297) % 233280) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function shuffleOptions(
  options: Record<string, string>,
  seed: number
): Record<string, string> {
  const keys = Object.keys(options);
  const values = keys.map((k) => options[k]);
  const shuffledVals = shuffleArray(values, seed);
  return keys.reduce((acc, k, i) => {
    acc[k] = shuffledVals[i];
    return acc;
  }, {} as Record<string, string>);
}
