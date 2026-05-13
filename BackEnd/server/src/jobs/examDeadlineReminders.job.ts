import pool from "~/config/db";
import { env } from "~/config/enviroment";
import { getEnrollmentsByClass } from "~/models/enrollment.model";
import {
  markExamReminderSent,
  type ExamDeadlineReminderKind,
} from "~/models/examDeadlineNotification.model";
import { isMailConfigured, sendMail } from "~/services/mail.service";

interface ExamReminderRow {
  id: string;
  title: string;
  class_id: string;
  closes_at: string;
}

async function loadExamsForReminder(kind: ExamDeadlineReminderKind): Promise<ExamReminderRow[]> {
  const intervalLiteral = kind === "24h" ? "24 hours" : "1 hour";
  const r = await pool.query<ExamReminderRow>(
    `
    SELECT e.id, e.title, e.class_id, e.closes_at
    FROM exams e
    WHERE e.closes_at IS NOT NULL
      AND e.closes_at > NOW()
      AND NOW() >= e.closes_at - $2::interval
      AND NOT EXISTS (
        SELECT 1 FROM exam_deadline_notifications n
        WHERE n.exam_id = e.id AND n.notification_type = $1
      )
    `,
    [kind, intervalLiteral]
  );
  return r.rows;
}

function buildEmailBody(title: string, closesAt: string, kind: ExamDeadlineReminderKind): string {
  const when = kind === "24h" ? "24 giờ" : "1 giờ";
  return (
    `Bài thi: ${title}\n` +
    `Hạn chót bắt đầu làm: ${closesAt}\n\n` +
    `Đây là email nhắc nhở (${when} trước hạn). Vui lòng đăng nhập hệ thống để làm bài đúng giờ.\n`
  );
}

async function processOneKind(kind: ExamDeadlineReminderKind): Promise<void> {
  let exams: ExamReminderRow[] = [];
  try {
    exams = await loadExamsForReminder(kind);
  } catch (e) {
    console.error("[exam-reminder] Không đọc được danh sách đề (đã chạy migration 004?)", e);
    return;
  }

  for (const ex of exams) {
    try {
      const rows = await getEnrollmentsByClass(ex.class_id);
      const emails = [
        ...new Set(
          rows
            .map((r: { email?: string | null }) => (typeof r.email === "string" ? r.email.trim() : ""))
            .filter(Boolean)
        ),
      ] as string[];

      const subject =
        kind === "24h"
          ? `[Nhắc nhở] Bài thi sắp đến hạn bắt đầu: ${ex.title}`
          : `[Nhắc nhở] Bài thi còn 1 giờ để bắt đầu: ${ex.title}`;
      const text = buildEmailBody(ex.title, ex.closes_at, kind);

      if (!isMailConfigured()) {
        console.warn(
          `[exam-reminder] Bỏ qua gửi mail (thiếu SMTP). exam=${ex.id} kind=${kind}. Đặt SMTP_HOST và MAIL_FROM trong .env.`
        );
        continue;
      }

      if (emails.length === 0) {
        await markExamReminderSent(ex.id, kind);
        continue;
      }

      await sendMail({ bcc: emails, subject, text });
      await markExamReminderSent(ex.id, kind);
    } catch (e) {
      console.error(`[exam-reminder] Lỗi exam=${ex.id} kind=${kind}`, e);
    }
  }
}

export async function runExamDeadlineReminderTick(): Promise<void> {
  await processOneKind("24h");
  await processOneKind("1h");
}

export function startExamDeadlineReminderScheduler(): NodeJS.Timeout {
  void runExamDeadlineReminderTick();
  return setInterval(() => {
    void runExamDeadlineReminderTick();
  }, env.EXAM_REMINDER_INTERVAL_MS);
}
