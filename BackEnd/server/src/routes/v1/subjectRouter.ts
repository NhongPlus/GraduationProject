import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  createSubject,
  querySubjectsPaginated,
  getSubjectById,
  updateSubject,
  deleteSubject,
  type CreateSubjectInput,
  type UpdateSubjectInput,
} from "~/models/subject.model";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";

const router = Router();

// All subject routes require admin or teacher
router.use(authMiddleware);
router.use(roleMiddleware(["admin", "teacher"]));

// GET /v1/subjects — list all
router.get("/", async (req, res, next) => {
  try {
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const search = req.query.search as string | undefined;
    const result = await querySubjectsPaginated(limit, offset, search);
    res.json({
      success: true,
      data: buildPaginatedList(result.items, result.total, limit, offset),
    });
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

// POST /v1/subjects — create (admin only)
router.post("/", roleMiddleware(["admin"]), async (req, res, next) => {
  try {
    const { name } = req.body as CreateSubjectInput;
    if (!name) {
      res.status(400).json({ success: false, error: "Tên môn học là bắt buộc" });
      return;
    }
    const subject = await createSubject(req.body as CreateSubjectInput);
    res.status(201).json({ success: true, data: subject });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ success: false, error: "Tên môn học đã tồn tại" });
      return;
    }
    next(err);
  }
});

// PATCH /v1/subjects/:id — update (admin only)
router.patch("/:id", roleMiddleware(["admin"]), async (req, res, next) => {
  try {
    const subject = await updateSubject(
      req.params.id,
      req.body as UpdateSubjectInput
    );
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

// DELETE /v1/subjects/:id — delete (admin only)
router.delete("/:id", roleMiddleware(["admin"]), async (req, res, next) => {
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