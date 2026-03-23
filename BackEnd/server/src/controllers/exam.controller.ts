import { Request, Response, NextFunction } from "express";

export const getExamListController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: connect to exam service / db
    res.json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};

export const createExamController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, duration } = req.body;
    if (!title || !duration) {
      return res.status(400).json({ success: false, message: "title and duration are required" });
    }

    // TODO: call examService.createExam
    res.status(201).json({ success: true, data: { title, description, duration } });
  } catch (error) {
    next(error);
  }
};
