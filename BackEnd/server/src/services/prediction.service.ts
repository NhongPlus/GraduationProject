import { env } from "~/config/enviroment";
import { MINIMAX_SYSTEM_PROMPT, loadKnowledgeBase } from "~/config/prediction.config";

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

function gradeToScoreMin(grade: string): number {
  const map: Record<string, number> = { "A+": 9, A: 8, B: 7, C: 6, "D+": 5, F: 0 };
  return map[grade] ?? 6;
}

export async function predictScore(req: PredictionRequest): Promise<PredictionResult> {
  if (!env.MINIMAX_API_KEY) {
    throw new Error("MINIMAX_API_KEY chưa được cấu hình");
  }

  const kb = loadKnowledgeBase();

  // Build history text
  const historyLines = req.history
    .slice(0, 20)
    .map((h) => `  - ${h.subject}: ${h.score}/10 (${h.grade})`)
    .join("\n");

  // Determine target subjects
  let targetSubjects: string[];
  if (req.target_subjects && req.target_subjects.length > 0) {
    targetSubjects = req.target_subjects;
  } else {
    // Auto-detect from chains: find subjects that depend on what student just completed
    const justCompleted = req.just_completed.subject;
    const found = kb.subjectChains.filter((chain) =>
      chain.from.some((f) => justCompleted.toLowerCase().includes(f.toLowerCase()))
    );
    targetSubjects = found.map((chain) => chain.to);

    // Also add sequential English subjects
    if (justCompleted.includes("Tiếng Anh P")) {
      const match = justCompleted.match(/P(\d+)/);
      if (match) {
        const currentPart = parseInt(match[1], 10);
        const nextParts = [currentPart + 1, currentPart + 2];
        for (const p of nextParts) {
          const nextName = `Tiếng Anh P${p}`;
          if (!targetSubjects.includes(nextName)) targetSubjects.push(nextName);
        }
      }
    }
  }

  // Build correlation info for targets
  const corrLines = targetSubjects
    .map((target) => {
      const corr = kb.correlations.find(
        (c) =>
          c.from.toLowerCase().includes(req.just_completed.subject.toLowerCase()) &&
          c.to.toLowerCase().includes(target.toLowerCase())
      );
      if (corr) return `  - ${target}: r=${corr.r}`;
      return `  - ${target}: r=0.00 (không có tương quan trực tiếp)`;
    })
    .join("\n");

  const userPrompt = `## INPUT — Dữ liệu sinh viên

### Thông tin sinh viên
- Mã SV: ${req.student_id}
- Họ tên: ${req.student_name ?? "không rõ"}

### Kết quả vừa thi
- Môn: **${req.just_completed.subject}**
- Điểm: **${req.just_completed.score}/10** — Xếp loại: **${req.just_completed.grade}**

### Lịch sử điểm (${req.history.length} môn đã thi)
${historyLines || "(chưa có)"}`;

  const targetList = targetSubjects.join(", ");
  const classAvgs = kb.subjectAverages
    .filter((s) => targetSubjects.some((t) => t.toLowerCase().includes(s.subject.toLowerCase())))
    .map((s) => `${s.subject}: ĐTB lớp=${s.avg}`)
    .join("; ");

  const requestText = `${userPrompt}

### Các môn cần dự đoán: ${targetList}
${
  classAvgs ? `\nThông tin thêm từ knowledge base:\n  ${kb.subjectAverages
    .filter((s) => targetSubjects.some((t) => t.toLowerCase().includes(s.subject.toLowerCase())))
    .map((s) => `${s.subject}: ĐTB lớp=${s.avg}`)
    .join("; ")}` : ""
}

## TASK
Dựa trên điểm vừa thi, lịch sử học tập, hệ số tương quan Pearson (r), và ĐTB lớp, hãy dự đoán điểm cho từng môn trong "Các môn cần dự đoán".

## OUTPUT — Chỉ trả về JSON, không thêm bất kỳ text nào khác

\`\`\`json
{
  "just_completed": {
    "subject": "${req.just_completed.subject}",
    "score": ${req.just_completed.score},
    "grade": "${req.just_completed.grade}",
    "vs_class_avg": "cao hơn/thấp hơn/bằng ĐTB lớp X điểm",
    "analysis": "nhận xét ngắn 1 câu về kết quả này"
  },
  "predictions": [
    {
      "subject": "tên môn",
      "semester": 0,
      "credits": 0,
      "predicted_score": 0.0,
      "grade": "A+|A|B|C|D+|F",
      "confidence": 0.0,
      "trend": "up|stable|down",
      "correlation_r": 0.0,
      "reasoning": "giải thích ngắn gọn dựa trên r và lịch sử"
    }
  ],
  "overall_advice": "1-2 câu khuyến nghị cụ thể"
}
\`\`\``;

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: MINIMAX_SYSTEM_PROMPT },
    { role: "user", content: requestText },
  ];

  const response = await fetch(`${env.MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.MINIMAX_MODEL,
      messages,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`MiniMax API error ${response.status}: ${text}`);
  }

  const json = await response.json() as { choices?: Array<{ messages?: Array<{ content_string?: string }> }> };
  const rawContent = json.choices?.[0]?.messages?.[0]?.content_string ?? "";

  // Extract JSON from markdown code block if present
  const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawContent.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : rawContent;

  try {
    const parsed = JSON.parse(jsonStr.trim()) as PredictionResult;
    return parsed;
  } catch {
    // Fallback: try to find partial JSON
    const result: PredictionResult = {
      just_completed: {
        subject: req.just_completed.subject,
        score: req.just_completed.score,
        grade: req.just_completed.grade,
        vs_class_avg: "cần kiểm tra lại",
        analysis: "Dữ liệu không đủ để phân tích chi tiết",
      },
      predictions: targetSubjects.map((subj) => ({
        subject: subj,
        semester: 0,
        credits: 0,
        predicted_score: gradeToScoreMin(req.just_completed.grade),
        grade: scoreToGrade(gradeToScoreMin(req.just_completed.grade)),
        confidence: 0.5,
        trend: "stable" as const,
        correlation_r: 0,
        reasoning: "Fallback do parse lỗi — sử dụng điểm môn vừa thi",
      })),
      overall_advice: "Không thể phân tích chi tiết. Vui lòng thử lại sau.",
    };
    return result;
  }
}
