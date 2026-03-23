export type UserRole = 'admin' | 'teacher' | 'student';

export type UserAccount = {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: UserRole;
};

const USER_STORAGE_KEY = 'mock_user_accounts';

const defaultUsers: UserAccount[] = [
  { id: 'u1', name: 'Administrator', username: 'admin', email: 'admin@example.com', role: 'admin' },
  { id: 'u2', name: 'Nguyễn Văn A', username: 'student1', email: 'a@example.com', role: 'student' },
  { id: 'u3', name: 'Trần Thị B', username: 'student2', email: 'b@example.com', role: 'student' },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getUsersFromStorage = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return defaultUsers;
    return JSON.parse(raw) as UserAccount[];
  } catch {
    return defaultUsers;
  }
};

const saveUsersToStorage = (users: UserAccount[]) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
};

const userApi = {
  getUsers: async () => {
    await delay(200);
    return getUsersFromStorage();
  },

  addUser: async (user: Omit<UserAccount, 'id'>) => {
    await delay(250);
    const users = getUsersFromStorage();
    const newUser = { ...user, id: `u${Date.now()}` };
    const created = [...users, newUser];
    saveUsersToStorage(created);
    return newUser;
  },

  deleteUser: async (id: string) => {
    await delay(200);
    const users = getUsersFromStorage();
    const remain = users.filter((u) => u.id !== id);
    saveUsersToStorage(remain);
    return remain;
  },
};

export default userApi;
