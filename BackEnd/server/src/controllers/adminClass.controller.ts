import { Request, Response, NextFunction } from "express";
import pool from "~/config/db";
import {
  getAllAdminClasses,
  getAdminClassById,
  getAdminClassByManager,
} from "~/models/adminClass.model";

export const listAdminClassesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (user.role === "teacher") {
      const mine = await getAdminClassByManager(user.userId);
      return res.json({ success: true, data: mine ? [mine] : [] });
    }
    const data = await getAllAdminClasses();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getAdminClassController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const row = await getAdminClassById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    }
    if (user.role === "teacher" && row.manager_teacher_id !== user.userId) {
      return res.status(403).json({ success: false, message: "Không có quyền xem lớp này" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
};

export const getMyAdminClassController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (user.role === "teacher") {
      const mine = await getAdminClassByManager(user.userId);
      if (!mine) {
        return res.status(404).json({ success: false, message: "Chưa được gán lớp quản lý" });
      }
      return res.json({ success: true, data: mine });
    }
    if (user.role === "student") {
      const { rows } = await pool.query(
        `SELECT ac.* FROM admin_classes ac
         JOIN accounts a ON a.admin_class_id = ac.id
         WHERE a.id = $1`,
        [user.userId]
      );
      if (!rows[0]) {
        return res.status(404).json({ success: false, message: "Chưa thuộc lớp hành chính" });
      }
      return res.json({ success: true, data: rows[0] });
    }
    res.status(400).json({ success: false, message: "Chỉ dành cho giáo viên hoặc sinh viên" });
  } catch (err) {
    next(err);
  }
};
