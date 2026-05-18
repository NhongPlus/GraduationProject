import {
  getScoreDistributionByExam,
  getScoreDistributionBySubject,
  getScoreDistributionByAdminClass,
} from "~/models/scoreAnalytics.model";

export const getExamScoreDistribution = async (examId: string) => {
  const data = await getScoreDistributionByExam(examId);
  if (!data) throw Object.assign(new Error("Exam not found"), { status: 404 });
  return data;
};

export const getAllSubjectsScoreDistribution = async () => {
  return getScoreDistributionBySubject();
};

export const getAllAdminClassesScoreDistribution = async () => {
  return getScoreDistributionByAdminClass();
};
