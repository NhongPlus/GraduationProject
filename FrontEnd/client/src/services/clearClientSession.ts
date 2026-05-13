import store, { persistor } from '@/store';
import { clearAuthState } from '@/store/authSlice';

/**
 * Xóa session khỏi localStorage + redux-persist (persist:root).
 * Purge trước rồi mới dispatch — tránh race: refreshAuthFromStorage đọc persist và khôi phục token.
 */
export async function clearClientSession(): Promise<void> {
  await persistor.purge();
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  localStorage.removeItem('persist:root');
  store.dispatch(clearAuthState());
  window.dispatchEvent(new Event('auth-change'));
}
