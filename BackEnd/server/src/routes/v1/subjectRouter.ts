import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from "~/models/subject.model";

const router = Router();

// All subject routes require admin or teacher
router.use(authMiddleware);
router.use(roleMiddleware(["admin", "teacher"]));

// GET /v1/subjects — list all
router.get("/", async (req, res, next) => {
  try {
    const subjects = await getAllSubjects();
    res.json({ success: true, data: subjects });
  } catch (err) {
    next(err);
  }
});

// GET /v1/subjects/:id
router.get("/:id", async (req, res, next) => {
  try {
    const subject = await getSubjectById(req.params.id);
    if (!subject) {
      res.status(404).json({ success: false, error: "Không tìm thấy môn học" });
      return;
    }
    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

// POST /v1/subjects — create
router.post("/", async (req, res, next) => {
  try {
    const { name, code } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: "Tên môn học là bắt buộc" });
      return;
    }
    const subject = await createSubject(name, code ?? "");
    res.status(201).json({ success: true, data: subject });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ success: false, error: "Tên môn học đã tồn tại" });
      return;
    }
    next(err);
  }
});

// PATCH /v1/subjects/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const fields: Record<string, string> = {};
    if (name !== undefined) fields.name = name;
    if (code !== undefined) fields.code = code;

    const subject = await updateSubject(req.params.id, fields);
    if (!subject) {
      res.status(404).json({ success: false, error: "Không tìm thấy môn học" });
      return;
    }
    res.json({ success: true, data: subject });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ success: false, error: "Tên môn học đã tồn tại" });
      return;
    }
    next(err);
  }
});

// DELETE /v1/subjects/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await deleteSubject(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Không tìm thấy môn học" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;