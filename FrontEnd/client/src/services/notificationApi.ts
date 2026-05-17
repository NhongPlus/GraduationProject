import apiClient from './apiClient';

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

export interface NotificationListResponse {
  success: boolean;
  data: UserNotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationCountResponse {
  success: boolean;
  data: number;
}

export const getNotifications = async (params?: {
  page?: number;
  limit?: number;
}): Promise<NotificationListResponse> => {
  const res = await apiClient.get<NotificationListResponse>('/notifications', { params });
  return res.data;
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