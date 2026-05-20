import apiClient from './apiClient';
import { fetchPaginatedList, type ListQueryParams, type PaginatedList } from './listApi';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  full_name: string | null;
  is_active: boolean;
  password_plain?: string | null;
  created_at: string;
  updated_at: string;
}

export type StudentListParams = ListQueryParams & {
  role?: 'student';
  admin_class_id?: string;
};

const userApi = {
  listStudents: async (params: StudentListParams = {}): Promise<PaginatedList<UserAccount>> =>
    fetchPaginatedList<UserAccount>('/users', { ...params, role: 'student' }),

  getUsers: async (params?: { role?: UserRole; limit?: number }): Promise<UserAccount[]> => {
    const result = await fetchPaginatedList<UserAccount>('/users', {
      limit: params?.limit ?? 500,
      offset: 0,
      role: params?.role,
    });
    return result.items;
  },

  getUser: async (id: string): Promise<UserAccount> => {
    const res = await apiClient.get<{ success: boolean; data: UserAccount }>(`/users/${id}`);
    return res.data.data;
  },

  addUser: async (user: {
    email: string;
    username: string;
    password: string;
    role: UserRole;
    full_name?: string;
  }): Promise<UserAccount> => {
    const res = await apiClient.post<{ success: boolean; data: UserAccount }>('/users', user);
    return res.data.data;
  },

  updateUser: async (
    id: string,
    fields: {
      full_name?: string | null;
      username?: string;
      email?: string;
      is_active?: boolean;
      role?: UserRole;
      password?: string;
    }
  ): Promise<UserAccount> => {
    const res = await apiClient.patch<{ success: boolean; data: UserAccount }>(`/users/${id}`, fields);
    return res.data.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  bulkDeleteUsers: async (
    ids: string[]
  ): Promise<{ deleted: number; failed: { id: string; reason: string }[] }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { deleted: number; failed: { id: string; reason: string }[] };
    }>('/users/bulk-delete', { ids });
    return res.data.data;
  },
};

export default userApi;
