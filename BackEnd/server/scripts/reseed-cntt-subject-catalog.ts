/**
 * Xóa toàn bộ nhóm môn & môn học CNTT, seed lại theo cấu trúc chương trình.
 * Chạy: npm run reseed-cntt-catalog
 */
import pool from "../src/config/db";

type GroupSeed = { code: string; name: string; description?: string; sort_order: number };
type SubjectSeed = { name: string; code: string; groupCode: string; category: string; credits?: number; semester?: number };

const GROUPS: GroupSeed[] = [
  {
    code: "pe",
    name: "Nhóm thể chất",
    description:
      "Sinh viên chọn 1 trong 3: Võ, Yoga, Zumba. Nếu chọn Zumba thì học cả cơ bản và nâng cao.",
    sort_order: 1,
  },
  { code: "defense", name: "Nhóm quốc phòng", sort_order: 2 },
  { code: "english", name: "Nhóm tiếng Anh", sort_order: 3 },
  { code: "ai_iot", name: "Nhóm học máy & IoT", sort_order: 4 },
  { code: "philosophy", name: "Nhóm môn triết học", sort_order: 5 },
  { code: "software", name: "Nhóm phần mềm", sort_order: 6 },
  { code: "bigdata", name: "Nhóm BigData", sort_order: 7 },
  { code: "network", name: "Nhóm Network", sort_order: 8 },
  { code: "internship", name: "Nhóm thực tập", sort_order: 9 },
  { code: "security", name: "Nhóm security", sort_order: 10 },
  { code: "soft_skills", name: "Nhóm kĩ năng mềm", sort_order: 11 },
  { code: "math", name: "Nhóm đại số", sort_order: 12 },
];

/** Mỗi tên môn chỉ xuất hiện một lần (UNIQUE name). Môn trùng giữa nhóm → gán nhóm chính. */
const SUBJECTS: SubjectSeed[] = [
  { name: "Lý luận và phương pháp Giáo dục thể chất 1", code: "PE001", groupCode: "pe", category: "general" },
  { name: "Võ (Cơ bản)", code: "PE002", groupCode: "pe", category: "general" },
  { name: "Yoga (Cơ bản)", code: "PE003", groupCode: "pe", category: "general" },
  { name: "Zumba(Cơ bản)", code: "PE004", groupCode: "pe", category: "general" },
  { name: "Zumba(Nâng cao)", code: "PE005", groupCode: "pe", category: "general" },
  { name: "Giáo dục quốc phòng P1", code: "ND001", groupCode: "defense", category: "general" },
  { name: "Giáo dục quốc phòng P2", code: "ND002", groupCode: "defense", category: "general" },
  { name: "Giáo dục quốc phòng P3", code: "ND003", groupCode: "defense", category: "general" },
  { name: "Giáo dục quốc phòng P4", code: "ND004", groupCode: "defense", category: "general" },
  { name: "Tiếng Anh P1", code: "ENG101", groupCode: "english", category: "english" },
  { name: "Tiếng Anh P2", code: "ENG102", groupCode: "english", category: "english" },
  { name: "Tiếng Anh P3", code: "ENG103", groupCode: "english", category: "english" },
  { name: "Tiếng Anh P4", code: "ENG104", groupCode: "english", category: "english" },
  { name: "Tiếng Anh P5", code: "ENG105", groupCode: "english", category: "english" },
  { name: "Nhập môn công nghệ thông tin", code: "CS001", groupCode: "ai_iot", category: "programming" },
  { name: "Trí tuệ nhân tạo", code: "AI401", groupCode: "ai_iot", category: "ai_ml" },
  { name: "Lập trình IoT", code: "CS331", groupCode: "ai_iot", category: "programming" },
  { name: "Học máy", code: "ML501", groupCode: "ai_iot", category: "ai_ml" },
  { name: "Cấu trúc dữ liệu và giải thuật", code: "CS201", groupCode: "ai_iot", category: "programming" },
  {
    name: "Thực tập CNTT5: Triển khai ứng dụng AI, IoT",
    code: "CS105",
    groupCode: "ai_iot",
    category: "general",
  },
  { name: "Thực tập CNTT1: Hệ thống máy tính", code: "CS101", groupCode: "ai_iot", category: "general" },
  { name: "Triết học Mác - Lênin", code: "PHI001", groupCode: "philosophy", category: "general" },
  { name: "Pháp luật đại cương", code: "LAW001", groupCode: "philosophy", category: "general" },
  { name: "Tư tưởng Hồ Chí Minh", code: "PHI004", groupCode: "philosophy", category: "general" },
  { name: "Chủ nghĩa xã hội khoa học", code: "PHI003", groupCode: "philosophy", category: "general" },
  { name: "Kinh tế chính trị Mác - Lênin", code: "PHI002", groupCode: "philosophy", category: "general" },
  { name: "Lịch sử Đảng Cộng sản Việt Nam", code: "HIS001", groupCode: "philosophy", category: "general" },
  { name: "Lập trình cơ bản", code: "CS111", groupCode: "software", category: "programming" },
  { name: "Lập trình hướng đối tượng", code: "CS202", groupCode: "software", category: "programming" },
  {
    name: "Thực tập CNTT2: Thiết kế web và triển khai hệ thống phần mềm",
    code: "CS102",
    groupCode: "software",
    category: "general",
  },
  {
    name: "Thực tập CNTT3: Thiết kế, lập trình Front-End",
    code: "CS103",
    groupCode: "software",
    category: "general",
  },
  {
    name: "Thực tập CNTT4: Thiết kế, lập trình Back-End",
    code: "CS104",
    groupCode: "software",
    category: "general",
  },
  { name: "Lý thuyết, thiết kế cơ sở dữ liệu", code: "DB001", groupCode: "software", category: "programming" },
  { name: "Công nghệ phần mềm", code: "SE601", groupCode: "software", category: "software_eng" },
  { name: "Lập trình mobile", code: "CS621", groupCode: "software", category: "software_eng" },
  { name: "Kiểm thử phần mềm", code: "SE802", groupCode: "software", category: "software_eng" },
  { name: "Công nghệ dữ liệu", code: "DT501", groupCode: "bigdata", category: "ai_ml" },
  { name: "Dữ liệu lớn", code: "BD601", groupCode: "bigdata", category: "ai_ml" },
  { name: "Phân tích, thiết kế hệ thống thông tin", code: "SA001", groupCode: "bigdata", category: "general" },
  { name: "Hệ thống thông tin địa lý", code: "GIS001", groupCode: "network", category: "network" },
  { name: "Mạng máy tính", code: "NET301", groupCode: "network", category: "network" },
  {
    name: "Thực tập CNTT6: Cài đặt, cấu hình máy chủ, mạng, triển khai ứng dụng",
    code: "CS106",
    groupCode: "network",
    category: "general",
  },
  { name: "Lập trình mạng", code: "NET801", groupCode: "network", category: "network" },
  { name: "Chuyển đổi số", code: "DS801", groupCode: "internship", category: "general" },
  { name: "Ứng dụng Công nghệ thông tin trong doanh nghiệp", code: "IT001", groupCode: "internship", category: "general" },
  { name: "Thực tập tốt nghiệp", code: "INT001", groupCode: "internship", category: "general" },
  { name: "An toàn, bảo mật thông tin", code: "SEC001", groupCode: "security", category: "network" },
  { name: "Kỹ năng mềm cơ bản", code: "SKL001", groupCode: "soft_skills", category: "general" },
  { name: "Kỹ năng mềm nâng cao", code: "SKL002", groupCode: "soft_skills", category: "general" },
  { name: "Đại số tuyến tính, tối ưu", code: "MATH001", groupCode: "math", category: "math" },
  { name: "Toán rời rạc", code: "MATH201", groupCode: "math", category: "math" },
  { name: "Toán giải tích", code: "MATH101", groupCode: "math", category: "math" },
  {
    name: "Xác suất thống kê và phân tích dữ liệu",
    code: "STAT001",
    groupCode: "math",
    category: "math",
  },
];

const BASE_GROUP_CODES = new Set(["pe", "defense", "english", "philosophy"]);

function scopeForGroup(code: string): "base" | "shared" | "catalog" {
  if (BASE_GROUP_CODES.has(code)) return "base";
  if (["math", "programming", "software", "ai_iot", "network", "software_eng"].includes(code)) {
    return "shared";
  }
  return "catalog";
}

async function clearCnttCatalog(programId: string): Promise<void> {
  const subjRes = await pool.query<{ id: string }>(
    `SELECT s.id FROM subjects s
     LEFT JOIN program_subjects ps ON ps.subject_id = s.id AND ps.program_id = $1
     LEFT JOIN subject_groups sg ON sg.id = s.subject_group_id
     LEFT JOIN program_subject_groups psg
       ON psg.subject_group_id = sg.id AND psg.program_id = $1
     WHERE ps.program_id IS NOT NULL OR psg.program_id IS NOT NULL`,
    [programId]
  );
  const subjectIds = subjRes.rows.map((r) => r.id);

  if (subjectIds.length > 0) {
    await pool.query(
      `DELETE FROM exams
       WHERE subject_id = ANY($1::uuid[])
          OR class_id IN (SELECT id FROM classes WHERE subject_id = ANY($1::uuid[]))`,
      [subjectIds]
    );
    await pool.query(`DELETE FROM question_bank WHERE subject_id = ANY($1::uuid[])`, [subjectIds]);
    await pool.query(`DELETE FROM classes WHERE subject_id = ANY($1::uuid[])`, [subjectIds]);
  }

  await pool.query(`DELETE FROM program_subjects WHERE program_id = $1`, [programId]);
  await pool.query(`DELETE FROM program_subject_groups WHERE program_id = $1`, [programId]);
  /** Không xóa toàn bộ kho — chỉ gỡ gán CNTT (môn/nhóm vẫn dùng cho ngành khác). */
}

async function main() {
  console.log("=== RESEED CNTT SUBJECT CATALOG ===\n");

  const prog = await pool.query<{ id: string }>(
    `SELECT id FROM programs WHERE code = 'CNTT' LIMIT 1`
  );
  const programId = prog.rows[0]?.id;
  if (!programId) {
    console.error("Không tìm thấy chương trình CNTT. Chạy migration programs trước.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await clearCnttCatalog(programId);

    const groupIdByCode = new Map<string, string>();
    for (const g of GROUPS) {
      const scope = scopeForGroup(g.code);
      const ins = await client.query<{ id: string }>(
        `INSERT INTO subject_groups (program_id, code, name, description, sort_order, group_scope)
         VALUES (NULL, $1, $2, $3, $4, $5)
         RETURNING id`,
        [g.code, g.name, g.description ?? null, g.sort_order, scope]
      );
      groupIdByCode.set(g.code, ins.rows[0].id);
      console.log(`  + Kho nhóm: ${g.name} (${g.code}, ${scope})`);
    }

    let subjectCount = 0;
    for (const s of SUBJECTS) {
      const groupId = groupIdByCode.get(s.groupCode);
      if (!groupId) throw new Error(`Missing group ${s.groupCode}`);
      await client.query(
        `INSERT INTO subjects (name, code, credits, semester, category, sub_category, subject_group_id, program_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, true)`,
        [
          s.name,
          s.code,
          s.credits ?? 0,
          s.semester ?? 0,
          s.category,
          s.groupCode,
          groupId,
        ]
      );
      subjectCount += 1;
    }

    for (const [, groupId] of groupIdByCode) {
      await client.query(
        `INSERT INTO program_subject_groups (program_id, subject_group_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [programId, groupId]
      );
    }

    await client.query(
      `INSERT INTO program_subjects (program_id, subject_id)
       SELECT $1, s.id FROM subjects s
       ON CONFLICT DO NOTHING`,
      [programId]
    );

    await client.query("COMMIT");
    console.log(`\nĐã seed kho: ${GROUPS.length} nhóm, ${subjectCount} môn; gán toàn bộ cho CNTT.`);
    console.log("Lưu ý: Đề thi / ngân hàng câu hỏi gắn môn cũ đã bị xóa theo môn CNTT.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
