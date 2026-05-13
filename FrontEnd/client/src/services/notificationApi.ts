import apiClient from './apiClient';

export interface NotificationItem {
  exam_id: string;
  title: string;
  duration_min: number;
  closes_at: string;
  class_name: string;
  active_count?: number;
  submitted_count?: number;
}

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const res = await apiClient.get<{ success: boolean; data: NotificationItem[] }>('/notifications');
  return res.data.data;
};