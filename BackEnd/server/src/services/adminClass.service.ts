import * as XLSX from "xlsx";
import {
  countClassesByManager,
  createAdminClass,
  updateAdminClass,
  deleteAdminClass,
  assignStudentsToClass,
  removeStudentFromClass,
  getAdminClassById,
  findStudentByUsernameOrEmail,
  type CreateAdminClassInput,
  type UpdateAdminClassInput,
} from "~/models/adminClass.model";
import { createUserService } from "~/services/user.service";
import { generateRandomPassword } from "~/utils/randomPassword";

const MAX_CLASSES_PER_TEACHER = 2;

export async function assertTeacherClassQuota(
  teacherId: string,
  excludeClassId?: string
): Promise<void> {
  let count = await countClassesByManager(teacherId);
  if (excludeClassId) {
    const row = await getAdminClassById(excludeClassId);
    if (row?.manager_teacher_id === teacherId) count -= 1;
  }
  if (count >= MAX_CLASSES_PER_TEACHER) {
    throw new Error(`Giáo viên chỉ được chủ nhiệm tối đa ${MAX_CLASSES_PER_TEACHER} lớp`);
  }
}

export async function createAdminClassService(input: CreateAdminClassInput) {
  if (input.manager_teacher_id) {
    await assertTeacherClassQuota(input.manager_teacher_id);
  }
  return createAdminClass(input);
}

export async function updateAdminClassService(id: string, input: UpdateAdminClassInput) {
  if (input.manager_teacher_id) {
    await assertTeacherClassQuota(input.manager_teacher_id, id);
  }
  return updateAdminClass(id, input);
}

export async function deleteAdminClassService(id: string) {
  const row = await getAdminClassById(id);
  if (!row) throw new Error("Không tìm thấy lớp");
  if (row.student_count > 0) {
    throw new Error("Không xóa lớp còn sinh viên. Hãy chuyển hoặc gỡ sinh viên trước.");
  }
  return deleteAdminClass(id);
}

export function buildImportTemplateBuffer(): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ["username", "email", "full_name", "ghi_chu"],
    ["1671020357", "1671020357@student.dainam.edu.vn", "Nguyễn Văn A", "Tuỳ chọn"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SinhVien");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export type ImportPreviewRow = {
  row: number;
  username: string;
  email: string;
  full_name: string;
  status: "ok" | "warn_transfer" | "error";
  message: string;
  student_id?: string;
};

export function parseImportExcel(buffer: Buffer): ImportPreviewRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  const out: ImportPreviewRow[] = [];
  let rowNum = 1;
  for (const raw of rows) {
    rowNum += 1;
    const username = String(raw.username ?? raw["Mã SV"] ?? raw["Ma SV"] ?? "").trim();
    const email = String(raw.email ?? raw["Email"] ?? "").trim();
    const full_name = String(raw.full_name ?? raw["Họ tên"] ?? raw["Ho ten"] ?? "").trim();
    if (!username && !email) continue;
    out.push({
      row: rowNum,
      username,
      email,
      full_name,
      status: "ok",
      message: "Chờ kiểm tra",
    });
  }
  return out;
}

export async function enrichImportPreview(
  classId: string,
  rows: ImportPreviewRow[],
  allowTransfer: boolean
): Promise<ImportPreviewRow[]> {
  const enriched: ImportPreviewRow[] = [];
  for (const r of rows) {
    const student = await findStudentByUsernameOrEmail(r.username, r.email);
    if (!student) {
      enriched.push({
        ...r,
        status: "error",
        message: "Không tìm thấy tài khoản sinh viên",
      });
      continue;
    }
    if (student.admin_class_id === classId) {
      enriched.push({
        ...r,
        status: "error",
        message: "Đã trong lớp này",
        student_id: student.id,
      });
      continue;
    }
    if (student.admin_class_id && student.admin_class_id !== classId) {
      if (allowTransfer) {
        enriched.push({
          ...r,
          status: "warn_transfer",
          message: "Sẽ chuyển từ lớp khác",
          student_id: student.id,
        });
      } else {
        enriched.push({
          ...r,
          status: "error",
          message: "Đang thuộc lớp khác (bật chuyển lớp để import)",
          student_id: student.id,
        });
      }
      continue;
    }
    enriched.push({
      ...r,
      status: "ok",
      message: "Sẵn sàng gán",
      student_id: student.id,
    });
  }
  return enriched;
}

export async function confirmImportRows(
  classId: string,
  studentIds: string[],
  allowTransfer: boolean
) {
  return assignStudentsToClass(classId, studentIds, allowTransfer);
}

export async function addManualStudentToClass(
  classId: string,
  payload: {
    username: string;
    email: string;
    full_name?: string;
    password?: string;
    allow_transfer?: boolean;
  }
) {
  const existing = await findStudentByUsernameOrEmail(payload.username, payload.email);
  if (existing) {
    const result = await assignStudentsToClass(
      classId,
      [existing.id],
      Boolean(payload.allow_transfer)
    );
    if (result.assigned === 0 && result.skipped[0]) {
      throw new Error(result.skipped[0].reason);
    }
    return { mode: "assigned" as const, student_id: existing.id };
  }
  const password = payload.password?.trim() || generateRandomPassword(10);
  const user = await createUserService(
    payload.email.trim(),
    payload.username.trim(),
    password,
    "student",
    payload.full_name?.trim()
  );
  await assignStudentsToClass(classId, [user.id], true);
  return { mode: "created" as const, student_id: user.id, password };
}

export { assignStudentsToClass, removeStudentFromClass, MAX_CLASSES_PER_TEACHER };
