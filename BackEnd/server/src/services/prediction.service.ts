import { env } from "~/config/enviroment";
import {
  loadModelWeights,
  predictGrade,
} from "~/services/gradePredictor.service";
import type { WrongItem } from "~/services/wrongAnswerBundle.service";
import {
  getGroupsForSubject,
  getPredictionTargets,
  loadGroupsFile,
  resolveSubjectId,
} from "~/utils/subjectGroups.util";

export type { WrongItem };

export interface JustCompleted {
  subject: string;
  score: number;
  grade: string;
  vs_class_avg?: string;
  analysis?: string;
}

export interface HistoryItem {
  subject: string;
  score: number;
  grade: string;
}

export interface PredictionRequest {
  student_id: string;
  student_name?: string;
  just_completed: JustCompleted;
  history: HistoryItem[];
  target_subjects?: string[];
}

export interface SubjectPrediction {
  subject: string;
  semester: number;
  credits: number;
  predicted_score: number;
  grade: string;
  confidence: number;
  trend: "up" | "stable" | "down";
  correlation_r: number;
  reasoning: string;
}

export interface PredictionResult {
  target_subject?: string;
  target_subject_id?: string;
  just_completed: JustCompleted;
  predictions: SubjectPrediction[];
  overall_advice: string;
  wrong_summary?: WrongItem[];
  improvement?: string[];
}

function scoreToGrade(score: number): string {
  if (score >= 9) return "A+";
  if (score >= 8) return "A";
  if (score >= 7) return "B";
  if (score >= 6) return "C";
  if (score >= 5) return "D+";
  return "F";
}

function buildScoresMap(
  req: PredictionRequest,
  completedId: string | null
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const h of req.history) {
    const id = resolveSubjectId(h.subject);
    if (id && h.score > 0) scores[id] = h.score;
  }
  if (completedId && req.just_completed.score > 0) {
    scores[completedId] = req.just_completed.score;
  }
  return scores;
}

function gpaFromScores(scores: Record<string, number>, fallback: number): number {
  const vals = Object.values(scores).filter((v) => v > 0);
  if (vals.length === 0) return fallback;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function vsClassAvgText(score: number, classAvg: number): string {
  const diff = +(score - classAvg).toFixed(1);
  if (Math.abs(diff) < 0.05) return `bằng ĐTB lớp (${classAvg})`;
  if (diff > 0) return `cao hơn ĐTB lớp ${diff} điểm (ĐTB lớp: ${classAvg})`;
  return `thấp hơn ĐTB lớp ${Math.abs(diff)} điểm (ĐTB lớp: ${classAvg})`;
}

function buildMathPredictions(
  targetNames: string[],
  scores: Record<string, number>,
  gpa: number,
  completedId: string | null,
  groupLabels: string[]
): SubjectPrediction[] {
  const weights = loadModelWeights();
  const out: SubjectPrediction[] = [];

  for (const name of targetNames) {
    const tid = resolveSubjectId(name);
    if (!tid) continue;
    try {
      const p = predictGrade({ subject_id: tid, scores, gpa });
      const model = weights.models[tid];
      let correlation_r = 0;
      if (completedId && model) {
        const hit = model.top_correlations.find(
          (c) => c.subject_id === completedId
        );
        correlation_r = hit?.r ?? 0;
      }
      const trend: SubjectPrediction["trend"] =
        p.vs_class_avg >= 0.3
          ? "up"
          : p.vs_class_avg <= -0.3
            ? "down"
            : "stable";
      const sameGroupNote = groupLabels.length
        ? `Cùng nhóm: ${groupLabels.join(", ")}. `
        : "";
      out.push({
        subject: name,
        semester: 0,
        credits: weights.subject_meta[tid]?.credits ?? 0,
        predicted_score: p.predicted_score,
        grade: p.predicted_grade,
        confidence: p.confidence,
        trend,
        correlation_r,
        reasoning: `${sameGroupNote}Mô hình hồi quy (R²=${p.model_r2}); ${p.features_used
          .filter((f) => f.same_group)
          .map((f) => f.name)
          .slice(0, 2)
          .join(", ") || "dựa trên GPA và điểm các môn liên quan"}.`,
      });
    } catch {
      /* bỏ qua môn không predict được */
    }
  }
  return out;
}

async function fetchAiCommentary(
  req: PredictionRequest,
  groupLabels: string[],
  predictions: SubjectPrediction[],
  vsClassAvg: string,
  wrongItems: WrongItem[]
): Promise<{ analysis: string; overall_advice: string; improvement: string[] }> {
  const fallbackImprovement =
    wrongItems.length > 0
      ? wrongItems.map((w) => `Ôn lại nội dung câu ${w.q}`)
      : [];
  const fallback = {
    analysis: `Kết quả ${req.just_completed.grade} ở môn ${req.just_completed.subject}, ${vsClassAvg}.`,
    overall_advice:
      predictions.length > 0
        ? `Tập trung các môn cùng nhóm (${groupLabels.join(", ")}): ${predictions.map((p) => p.subject).join(", ")}.`
        : "Tiếp tục duy trì phong độ học tập.",
    improvement: fallbackImprovement,
  };
  if (!env.MINIMAX_API_KEY) return fallback;

  const predLines = predictions
    .map((p) => `${p.subject}: ${p.predicted_score}/10 (R²≈${Math.round(p.confidence * 100) / 100})`)
    .join("; ");

  const diagnosticPayload = {
    exam_subject: req.just_completed.subject,
    exam_score_10: req.just_completed.score,
    wrong_items: wrongItems,
    predict_targets: predictions.map((p) => ({
      subject: p.subject,
      score_math: p.predicted_score,
      model_r2: p.confidence,
    })),
  };

  const prompt = `Bạn là giáo viên CNTT. Phân tích dựa trên JSON sau (câu trong wrong_items đã là câu SAI, không cần đáp án ABCD):
${JSON.stringify(diagnosticPayload)}

Quy tắc:
- KHÔNG đổi score_math trong predict_targets.
- Chỉ nhận xét môn trong predict_targets / nhóm: ${groupLabels.join(", ") || "—"}.
- improvement: gợi ý ôn cụ thể từ stem/explanation_short (trích q nếu cần).
Trả CHỈ JSON: {"analysis":"1 câu về bài vừa thi","overall_advice":"1-2 câu","improvement":["gợi ý 1","gợi ý 2"]}`;

  const response = await fetch(`${env.MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.MINIMAX_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Trả lời ngắn tiếng Việt, chỉ JSON, không suy luận dài, không thêm môn ngoài nhóm.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 900,
    }),
  });

  if (!response.ok) return fallback;
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const match =
    raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/\{[\s\S]*\}/);
  const jsonStr = match ? (match[1] ?? match[0]) : raw;
  try {
    const parsed = JSON.parse(jsonStr.trim()) as {
      analysis?: string;
      overall_advice?: string;
      improvement?: string[];
    };
    const improvement = Array.isArray(parsed.improvement)
      ? parsed.improvement.filter((s) => typeof s === "string" && s.trim()).slice(0, 8)
      : fallback.improvement;
    return {
      analysis: parsed.analysis ?? fallback.analysis,
      overall_advice: parsed.overall_advice ?? fallback.overall_advice,
      improvement,
    };
  } catch {
    return fallback;
  }
}

export type PredictScoreOptions = {
  wrong_items?: WrongItem[];
};

export async function predictScore(
  req: PredictionRequest,
  options: PredictScoreOptions = {}
): Promise<PredictionResult> {
  const wrongItems = options.wrong_items ?? [];
  const historyNames = req.history.map((h) => h.subject);
  const explicitTargets =
    req.target_subjects && req.target_subjects.length > 0
      ? req.target_subjects
      : null;

  const { targets, groupLabels, completedId } = explicitTargets
    ? (() => {
        const targetName = explicitTargets[0];
        const gids = getGroupsForSubject(targetName);
        const file = loadGroupsFile();
        const labels = gids
          .map((gid) => file.groups[gid]?.label)
          .filter((l): l is string => Boolean(l));
        return {
          targets: explicitTargets,
          groupLabels: labels,
          completedId: resolveSubjectId(req.just_completed.subject),
        };
      })()
    : getPredictionTargets(req.just_completed.subject, historyNames);

  const weights = loadModelWeights();
  const completedMeta = completedId
    ? weights.subject_meta[completedId]
    : null;
  const classAvg = completedMeta?.mean ?? req.just_completed.score;
  const vsClassAvg = vsClassAvgText(req.just_completed.score, classAvg);

  const scores = buildScoresMap(req, completedId);
  const gpa = gpaFromScores(scores, req.just_completed.score);

  const predictions = buildMathPredictions(
    targets,
    scores,
    gpa,
    completedId,
    groupLabels
  );

  const commentary = await fetchAiCommentary(
    req,
    groupLabels,
    predictions,
    vsClassAvg,
    wrongItems
  );

  return {
    just_completed: {
      subject: req.just_completed.subject,
      score: req.just_completed.score,
      grade: req.just_completed.grade,
      vs_class_avg: vsClassAvg,
      analysis: commentary.analysis,
    },
    predictions,
    overall_advice:
      predictions.length === 0
        ? `Môn "${req.just_completed.subject}" thuộc nhóm ${groupLabels.join(", ") || "chưa phân loại"}. Không còn môn cùng nhóm cần dự đoán tiếp theo lịch sử hiện tại. ${commentary.overall_advice}`
        : commentary.overall_advice,
    wrong_summary: wrongItems.length > 0 ? wrongItems : undefined,
    improvement:
      commentary.improvement.length > 0 ? commentary.improvement : undefined,
  };
}
