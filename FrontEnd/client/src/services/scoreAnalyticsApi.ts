import apiClient from './apiClient';

export type ScoreBucket = {
  range_label: string;
  min_pct: number;
  max_pct: number;
  count: number;
};

export type SubjectScoreDistribution = {
  subject_id: string;
  subject_name: string;
  total_students: number;
  avg_score: number | null;
  buckets: ScoreBucket[];
};

export type AdminClassScoreDistribution = {
  admin_class_id: string | null;
  class_label: string;
  total_students: number;
  avg_score: number | null;
  buckets: ScoreBucket[];
};

const scoreAnalyticsApi = {
  getBySubjects: async (): Promise<SubjectScoreDistribution[]> => {
    const res = await apiClient.get<{ success: boolean; data: SubjectScoreDistribution[] }>(
      '/score-analytics/subjects'
    );
    return res.data.data ?? [];
  },

  getByAdminClasses: async (): Promise<AdminClassScoreDistribution[]> => {
    const res = await apiClient.get<{ success: boolean; data: AdminClassScoreDistribution[] }>(
      '/score-analytics/admin-classes'
    );
    return res.data.data ?? [];
  },
};

export default scoreAnalyticsApi;
