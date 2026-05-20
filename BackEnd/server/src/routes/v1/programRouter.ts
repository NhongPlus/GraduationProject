import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  createProgram,
  deleteProgram,
  getAllPrograms,
  getProgramById,
  updateProgram,
  type CreateProgramInput,
  type UpdateProgramInput,
} from "~/models/program.model";
import pool from "~/config/db";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["admin"]));

router.get("/", async (_req, res, next) => {
  try {
    const data = await getAllPrograms();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const program = await getProgramById(req.params.id);
    if (!program) {
      res.status(404).json({ success: false, error: "Không tìm thấy chuyên ngành" });
      return;
    }
    res.json({ success: true, data: program });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = req.body as CreateProgramInput;
    if (!body.code?.trim() || !body.name?.trim()) {
      res.status(400).json({ success: false, error: "Mã và tên chuyên ngành là bắt buộc" });
      return;
    }
    const program = await createProgram(body);
    res.status(201).json({ success: true, data: program });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === "23505") {
      res.status(409).json({ success: false, error: "Mã chuyên ngành đã tồn tại" });
      return;
    }
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const program = await updateProgram(req.params.id, req.body as UpdateProgramInput);
    if (!program) {
      res.status(404).json({ success: false, error: "Không tìm thấy chuyên ngành" });
      return;
    }
    res.json({ success: true, data: program });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === "23505") {
      res.status(409).json({ success: false, error: "Mã chuyên ngành đã tồn tại" });
      return;
    }
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const count = await pool.query<{ c: number }>(
      "SELECT COUNT(*)::int AS c FROM subjects WHERE program_id = $1",
      [req.params.id]
    );
    if ((count.rows[0]?.c ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: "Không xóa được: chuyên ngành còn môn học. Hãy chuyển hoặc xóa môn trước.",
      });
      return;
    }
    const deleted = await deleteProgram(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Không tìm thấy chuyên ngành" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
