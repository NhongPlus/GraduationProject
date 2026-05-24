/**
 * Xóa dữ liệu phiên thi / điểm / thi lại để test lại từ đầu.
 *
 * Chạy (local hoặc Render shell, cần DATABASE_URL):
 *   npm run clear-exam-data
 *   npm run clear-exam-data -- --exam-id=<uuid>
 *   npm run clear-exam-data -- --student-email=lop10czodoi@gmail.com
 */
import pool from "../src/config/db";

async function main() {
  const args = process.argv.slice(2);
  let examId = "";
  let studentEmail = "";

  for (const arg of args) {
    if (arg.startsWith("--exam-id=")) examId = arg.slice("--exam-id=".length).trim();
    else if (arg.startsWith("--student-email=")) studentEmail = arg.slice("--student-email=".length).trim();
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let studentId: string | null = null;
    if (studentEmail) {
      const row = await client.query<{ id: string }>(
        `SELECT id FROM accounts WHERE email = $1 LIMIT 1`,
        [studentEmail]
      );
      studentId = row.rows[0]?.id ?? null;
      if (!studentId) {
        throw new Error(`Không tìm thấy tài khoản email: ${studentEmail}`);
      }
    }

    const sessionFilter = [
      examId ? "exam_id = $1" : "TRUE",
      studentId ? `student_id = $${examId ? 2 : 1}` : "TRUE",
    ]
      .filter(Boolean)
      .join(" AND ");

    const params: string[] = [];
    if (examId) params.push(examId);
    if (studentId) params.push(studentId);

    const countRes = await client.query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt FROM exam_sessions WHERE ${sessionFilter}`,
      params
    );
    const sessionCount = countRes.rows[0]?.cnt ?? 0;

    if (sessionCount === 0) {
      console.log("[clear-exam-data] Không có phiên thi nào khớp bộ lọc.");
    } else {
      console.log(`[clear-exam-data] Sẽ xóa ${sessionCount} phiên thi...`);

      await client.query(
        `UPDATE exam_retake_grants g
         SET superseded_session_id = NULL, consumed_session_id = NULL
         WHERE EXISTS (
           SELECT 1 FROM exam_sessions s
           WHERE ${sessionFilter.replace(/exam_id/g, "s.exam_id").replace(/student_id/g, "s.student_id")}
             AND (g.superseded_session_id = s.id OR g.consumed_session_id = s.id)
         )`,
        params
      );

      await client.query(
        `UPDATE exam_sessions SET superseded_by = NULL, retake_grant_id = NULL
         WHERE ${sessionFilter}`,
        params
      );

      await client.query(
        `DELETE FROM exam_integrity_events e
         WHERE EXISTS (
           SELECT 1 FROM exam_sessions s
           WHERE s.id = e.session_id AND ${sessionFilter.replace(/exam_id/g, "s.exam_id").replace(/student_id/g, "s.student_id")}
         )`,
        params
      );

      await client.query(
        `DELETE FROM exam_proctor_logs p
         WHERE EXISTS (
           SELECT 1 FROM exam_sessions s
           WHERE s.id = p.session_id AND ${sessionFilter.replace(/exam_id/g, "s.exam_id").replace(/student_id/g, "s.student_id")}
         )`,
        params
      );

      const deleted = await client.query(
        `DELETE FROM exam_sessions WHERE ${sessionFilter} RETURNING id`,
        params
      );
      console.log(`[clear-exam-data] Đã xóa ${deleted.rowCount} phiên thi.`);
    }

    const grantFilter = [
      examId ? "exam_id = $1" : "TRUE",
      studentId ? `student_id = $${examId ? 2 : 1}` : "TRUE",
    ].join(" AND ");

    const grants = await client.query(
      `DELETE FROM exam_retake_grants WHERE ${grantFilter} RETURNING id`,
      params
    );
    console.log(`[clear-exam-data] Đã xóa ${grants.rowCount} quyền thi lại.`);

    const runtimeFilter = examId ? "exam_id = $1" : "TRUE";
    const runtimeParams = examId ? [examId] : [];
    const runtime = await client.query(
      `UPDATE exam_runtime_state SET is_active = false, ends_at = NOW()
       WHERE is_active = true AND ${runtimeFilter}
       RETURNING exam_id`,
      runtimeParams
    );
    console.log(`[clear-exam-data] Đã dừng ${runtime.rowCount} phiên runtime đang active.`);

    await client.query("COMMIT");
    console.log("[clear-exam-data] Xong. SV có thể vào làm lại sau khi GV mở phiên thi.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[clear-exam-data] Lỗi:", err);
  process.exit(1);
});
