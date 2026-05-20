import { Request, Response, NextFunction } from "express";
import {
  listUsersPaginated,
  getUserDetail,
  createUserService,
  updateUserService,
  deleteUserService,
  bulkDeleteUsersService,
} from "~/services/user.service";
import { changePasswordService } from "~/services/auth.service";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";

export const getUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const role = req.query.role as "admin" | "teacher" | "student" | undefined;
    const search = req.query.search as string | undefined;
    const admin_class_id = req.query.admin_class_id as string | undefined;
    const result = await listUsersPaginated(limit, offset, { role, search, admin_class_id });
    res.json({
      success: true,
      data: buildPaginatedList(result.items, result.total, limit, offset),
    });
  } catch (err) { next(err); }
};

export const getUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserDetail(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const createUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, password, role, full_name } = req.body;
    if (!email || !username || !password || !role) {
      return res.status(400).json({ success: false, message: "email/username/password/role là bắt buộc" });
    }
    const user = await createUserService(email, username, password, role, full_name);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const updateUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { full_name, is_active, role, username, email, password } = req.body;
    const user = await updateUserService(req.params.id, {
      full_name,
      is_active,
      role,
      username,
      email,
      password,
    });
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, data: user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("đã tồn tại")) {
      return res.status(409).json({ success: false, message: msg });
    }
    next(err);
  }
};

export const bulkDeleteUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.body?.ids;
    const ids = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids là bắt buộc" });
    }
    const result = await bulkDeleteUsersService(ids);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await deleteUserService(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, message: "Đã xóa người dùng" });
  } catch (err) { next(err); }
};

export const changePasswordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: "current_password và new_password là bắt buộc" });
    }

    const actor = (req as any).user;
    const targetId = req.params.id;

    // Student chỉ được đổi password của chính mình. Admin được đổi của ai cũng được.
    if (actor.role !== "admin" && actor.userId !== targetId) {
      return res.status(403).json({ success: false, message: "Không có quyền đổi password này" });
    }

    await changePasswordService(targetId, current_password, new_password);
    res.json({ success: true, message: "Đã đổi mật khẩu thành công" });
  } catch (err: any) {
    if (err.message?.includes("hiện tại không đúng") || err.message?.includes("ít nhất 8")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};