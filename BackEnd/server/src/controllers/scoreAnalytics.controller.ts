import { Request, Response, NextFunction } from "express";
import {
  getExamScoreDistribution,
  getAllSubjectsScoreDistribution,
  getAllAdminClassesScoreDistribution,
} from "~/services/scoreAnalytics.service";

export const getExamScoreDistributionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getExamScoreDistribution(req.params.examId);
    res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
};

export const getAllSubjectsScoreDistributionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getAllSubjectsScoreDistribution();
    res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
};

export const getAllAdminClassesScoreDistributionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getAllAdminClassesScoreDistribution();
    res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
};
