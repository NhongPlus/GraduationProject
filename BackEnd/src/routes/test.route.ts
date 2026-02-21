import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Test route working" });
});

export default router;