import * as XLSX from "xlsx";
import {
  countClassesByManager,
  createAdminClass,
  updateAdminClass,
  deleteAdminClass,
  assignStudentsToClass,
  removeStudentFromClass,
  getAdminClassById,
  type CreateAdminClassInput,
  type UpdateAdminClassInput,
} from "~/models/adminClass.model";
import { getUserByEmail, getUserByUsername, type User, type UserRole } from "~/models/user.model";
import { createUserService } from "~/services/user.service";
import { generateRandomPassword } from "~/utils/randomPassword";

const MAX_CLASSES_PER_TEACHER = 2;
const DEFAULT_STUDENT_EMAIL_SUFFIX = "@student.dainam.edu.vn";

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

function roleLabel(role: UserRole): string {
  if (role === "teacher") return "giáo viên";
  if (role === "admin") return "quản trị";
  return role;
}

export function normalizeStudentEmail(username: string, email?: string): string {
  const e = email?.trim();
  if (e) return e;
  const u = username.trim();
  return u ? `${u}${DEFAULT_STUDENT_EMAIL_SUFFIX}` : "";
}

type ResolvedStudent = {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  admin_class_id: string | null;
};

export type AccountResolveResult =
  | { kind: "student"; student: ResolvedStudent }
  | { kind: "create" }
  | { kind: "error"; message: string };

/** Kiểm tra mã SV / email — tên có thể trùng, ID (username) và email không được trùng giữa các vai trò. */
export async function resolveStudentAccount(
  username: string,
  email?: string
): Promise<AccountResolveResult> {
  const u = username.trim();
  if (!u) return { kind: "error", message: "Thiếu mã sinh viên" };

  const normalizedEmail = normalizeStudentEmail(u, email);
  const byUsername = await getUserByUsername(u);
  const byEmail = await getUserByEmail(normalizedEmail);

  if (byUsername && byUsername.role !== "student") {
    return {
      kind: "error",
      message: `Mã SV "${u}" đã dùng cho tài khoản ${roleLabel(byUsername.role)}`,
    };
  }
  if (byEmail && byEmail.role !== "student") {
    return {
      kind: "error",
      message: `Email đã dùng cho tài khoản ${roleLabel(byEmail.role)}`,
    };
  }
  if (byUsername && byEmail && byUsername.id !== byEmail.id) {
    return {
      kind: "error",
      message: "Mã SV và email thuộc hai tài khoản khác nhau trong hệ thống",
    };
  }

  const student = (byUsername ?? byEmail) as User | undefined;
  if (student?.role === "student") {
    return {
      kind: "student",
      student: {
        id: student.id,
        username: student.username,
        email: student.email,
        full_name: student.full_name,
        admin_class_id: student.admin_class_id ?? null,
      },
    };
  }
  return { kind: "create" };
}

export function buildImportTemplateBuffer(): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ["username", "email", "full_name", "ghi_chu"],
    [
      "1671020357",
      "1671020357@student.dainam.edu.vn",
      "Nguyễn Văn A",
      "Mã SV bắt buộc; email có thể để trống (tự sinh); chưa có TK sẽ được tạo mới",
    ],
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
  status: "ok" | "warn_transfer" | "will_create" | "error";
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
    const emailRaw = String(raw.email ?? raw["Email"] ?? "").trim();
    const full_name = String(raw.full_name ?? raw["Họ tên"] ?? raw["Ho ten"] ?? "").trim();
    if (!username && !emailRaw) continue;
    const email = normalizeStudentEmail(username, emailRaw);
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

function markDuplicateRowsInFile(rows: ImportPreviewRow[]): void {
  const usernameRows = new Map<string, number[]>();
  const emailRows = new Map<string, number[]>();
  for (const r of rows) {
    const u = r.username.trim().toLowerCase();
    if (u) {
      const list = usernameRows.get(u) ?? [];
      list.push(r.row);
      usernameRows.set(u, list);
    }
    const e = r.email.trim().toLowerCase();
    if (e) {
      const list = emailRows.get(e) ?? [];
      list.push(r.row);
      emailRows.set(e, list);
    }
  }
  for (const r of rows) {
    const u = r.username.trim().toLowerCase();
    if (u && (usernameRows.get(u)?.length ?? 0) > 1) {
      r.status = "error";
      r.message = "Mã SV trùng trong file Excel";
      continue;
    }
    const e = r.email.trim().toLowerCase();
    if (e && (emailRows.get(e)?.length ?? 0) > 1) {
      r.status = "error";
      r.message = "Email trùng trong file Excel";
    }
  }
}

function applyClassAssignmentStatus(
  r: ImportPreviewRow,
  classId: string,
  student: ResolvedStudent,
  allowTransfer: boolean
): ImportPreviewRow {
  if (student.admin_class_id === classId) {
    return {
      ...r,
      status: "error",
      message: "Đã trong lớp này",
      student_id: student.id,
    };
  }
  if (student.admin_class_id && student.admin_class_id !== classId) {
    if (allowTransfer) {
      return {
        ...r,
        status: "warn_transfer",
        message: "Sẽ chuyển từ lớp khác",
        student_id: student.id,
      };
    }
    return {
      ...r,
      status: "error",
      message: "Đang thuộc lớp khác (bật chuyển lớp để import)",
      student_id: student.id,
    };
  }
  return {
    ...r,
    status: "ok",
    message: "Sẵn sàng gán vào lớp",
    student_id: student.id,
  };
}

export async function enrichImportPreview(
  classId: string,
  rows: ImportPreviewRow[],
  allowTransfer: boolean
): Promise<ImportPreviewRow[]> {
  markDuplicateRowsInFile(rows);

  const enriched: ImportPreviewRow[] = [];
  for (const r of rows) {
    if (r.status === "error") {
      enriched.push(r);
      continue;
    }

    if (!r.username.trim()) {
      enriched.push({
        ...r,
        status: "error",
        message: "Thiếu mã sinh viên (username)",
      });
      continue;
    }

    const email = normalizeStudentEmail(r.username, r.email);
    const resolved = await resolveStudentAccount(r.username, email);

    if (resolved.kind === "error") {
      enriched.push({ ...r, email, status: "error", message: resolved.message });
      continue;
    }

    if (resolved.kind === "create") {
      enriched.push({
        ...r,
        email,
        status: "will_create",
        message: "Chưa có tài khoản — sẽ tạo mới và gán lớp",
      });
      continue;
    }

    enriched.push(applyClassAssignmentStatus({ ...r, email }, classId, resolved.student, allowTransfer));
  }
  return enriched;
}

export type ImportConfirmCreateRow = {
  username: string;
  email: string;
  full_name?: string;
};

export async function confirmImportRows(
  classId: string,
  studentIds: string[],
  creates: ImportConfirmCreateRow[],
  allowTransfer: boolean
): Promise<{
  assigned: number;
  created: number;
  skipped: { id: string; reason: string }[];
  create_errors: { username: string; reason: string }[];
}> {
  const assignResult = await assignStudentsToClass(classId, studentIds, allowTransfer);
  let created = 0;
  const create_errors: { username: string; reason: string }[] = [];

  for (const row of creates) {
    const username = row.username.trim();
    const email = normalizeStudentEmail(username, row.email);
    if (!username) {
      create_errors.push({ username: "(trống)", reason: "Thiếu mã sinh viên" });
      continue;
    }

    const resolved = await resolveStudentAccount(username, email);
    if (resolved.kind === "error") {
      create_errors.push({ username, reason: resolved.message });
      continue;
    }

    if (resolved.kind === "student") {
      const one = await assignStudentsToClass(classId, [resolved.student.id], allowTransfer);
      if (one.assigned > 0) {
        created += 0;
        assignResult.assigned += one.assigned;
      } else if (one.skipped[0]) {
        create_errors.push({ username, reason: one.skipped[0].reason });
      }
      continue;
    }

    try {
      const password = generateRandomPassword(10);
      await createUserService(
        email,
        username,
        password,
        "student",
        row.full_name?.trim(),
        classId
      );
      created += 1;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không tạo được tài khoản";
      create_errors.push({ username, reason: msg });
    }
  }

  return {
    assigned: assignResult.assigned,
    created,
    skipped: assignResult.skipped,
    create_errors,
  };
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
  const username = payload.username.trim();
  const email = normalizeStudentEmail(username, payload.email);
  if (!username) throw new Error("Thiếu mã sinh viên");

  const resolved = await resolveStudentAccount(username, email);
  if (resolved.kind === "error") throw new Error(resolved.message);

  if (resolved.kind === "student") {
    const result = await assignStudentsToClass(
      classId,
      [resolved.student.id],
      Boolean(payload.allow_transfer)
    );
    if (result.assigned === 0 && result.skipped[0]) {
      throw new Error(result.skipped[0].reason);
    }
    return { mode: "assigned" as const, student_id: resolved.student.id };
  }

  const password = payload.password?.trim() || generateRandomPassword(10);
  const user = await createUserService(
    email,
    username,
    password,
    "student",
    payload.full_name?.trim(),
    classId
  );
  return { mode: "created" as const, student_id: user.id, password };
}

export { assignStudentsToClass, removeStudentFromClass, MAX_CLASSES_PER_TEACHER };
