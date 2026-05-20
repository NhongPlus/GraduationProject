import { env } from "~/config/enviroment";
import {
  loadModelWeights,
  predictGrade,
} from "~/services/gradePredictor.service";
import {
  getPredictionTargets,
  resolveSubjectId,
} from "~/utils/subjectGroups.util";

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
  just_completed: JustCompleted;
  predictions: SubjectPrediction[];
  overall_advice: string;
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
  vsClassAvg: string
): Promise<{ analysis: string; overall_advice: string }> {
  const fallback = {
    analysis: `Kết quả ${req.just_completed.grade} ở môn ${req.just_completed.subject}, ${vsClassAvg}.`,
    overall_advice:
      predictions.length > 0
        ? `Tập trung các môn cùng nhóm (${groupLabels.join(", ")}): ${predictions.map((p) => p.subject).join(", ")}.`
        : "Tiếp tục duy trì phong độ học tập.",
  };
  if (!env.MINIMAX_API_KEY) return fallback;

  const predLines = predictions
    .map((p) => `${p.subject}: ${p.predicted_score}/10`)
    .join("; ");
  const prompt = `Bạn là giáo viên CNTT. SV vừa thi "${req.just_completed.subject}" đạt ${req.just_completed.score}/10 (${vsClassAvg}).
Chỉ dự đoán trong nhóm: ${groupLabels.join(", ") || "—"}.
Điểm dự đoán đã tính sẵn (KHÔNG đổi): ${predLines || "không có môn cùng nhóm"}.
Trả CHỈ JSON: {"analysis":"1 câu","overall_advice":"1-2 câu"}`;

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
      max_tokens: 400,
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
    };
    return {
      analysis: parsed.analysis ?? fallback.analysis,
      overall_advice: parsed.overall_advice ?? fallback.overall_advice,
    };
  } catch {
    return fallback;
  }
}

export async function predictScore(req: PredictionRequest): Promise<PredictionResult> {
  const historyNames = req.history.map((h) => h.subject);
  const { targets, groupLabels, completedId } =
    req.target_subjects && req.target_subjects.length > 0
      ? {
          targets: req.target_subjects,
          groupLabels: getPredictionTargets(req.just_completed.subject, historyNames)
            .groupLabels,
          completedId: resolveSubjectId(req.just_completed.subject),
        }
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
    vsClassAvg
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
  };
}
