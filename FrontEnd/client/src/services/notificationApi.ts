import apiClient from './apiClient';
import { unwrapPaginatedData, type PaginatedList } from '@/utils/pagination';

export interface UserNotificationItem {
  id: string;
  user_id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export type NotificationListResult = PaginatedList<UserNotificationItem> & {
  success: boolean;
};

export interface NotificationCountResponse {
  success: boolean;
  data: number;
}

export const getNotifications = async (params?: {
  page?: number;
  limit?: number;
}): Promise<NotificationListResult> => {
  const res = await apiClient.get<{ success: boolean; data: unknown }>('/notifications', { params });
  const list = unwrapPaginatedData<UserNotificationItem>(res.data.data);
  return { success: res.data.success, ...list };
};

export const getUnreadCount = async (): Promise<number> => {
  const res = await apiClient.get<NotificationCountResponse>('/notifications/unread-count');
  return res.data.data;
};

export const markAsRead = async (id: string): Promise<void> => {
  await apiClient.patch(`/notifications/${id}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
  await apiClient.patch('/notifications/read-all');
};