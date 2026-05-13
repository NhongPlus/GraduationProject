import { Request, Response, NextFunction } from "express";
import {
  getUsers,
  getUserDetail,
  createUserService,
  updateUserService,
  deleteUserService,
} from "~/services/user.service";
import { changePasswordService } from "~/services/auth.service";

export const getUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getUsers();
    res.json({ success: true, data: users });
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
    const { full_name, is_active, role } = req.body;
    const user = await updateUserService(req.params.id, { full_name, is_active, role });
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
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