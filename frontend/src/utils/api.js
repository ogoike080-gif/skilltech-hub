// frontend/src/utils/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://skilltech-hub-production.up.railway.app';

console.log('================================');
console.log('VITE_API_URL (raw env):', import.meta.env.VITE_API_URL);
console.log('API_URL FINAL (used):', API_URL);
console.log('MODE:', import.meta.env.MODE);
console.log('================================');

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('sth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken =
  localStorage.getItem('sth_refresh');

if (
  !refreshToken ||
  refreshToken === 'undefined' ||
  refreshToken === 'null' ||
  refreshToken === ''
) {
  throw new Error('No valid refresh token');
}
        const response = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem('sth_token', accessToken);
        localStorage.setItem('sth_refresh', newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
       localStorage.removeItem('sth_token');
localStorage.removeItem('sth_refresh');
localStorage.removeItem('sth_user');

window.location.replace('/login');
        return Promise.reject(refreshError);
      }
    }

    // ── Silent fail for background/homepage data fetches ──────────
    // Don't show a toast for routes that load data on page mount
    // (homepage widgets, optional previews etc). These should just
    // render empty states instead of interrupting the user.
    const silentRoutes = ['/courses', '/live', '/schools', '/community/posts', '/mentors', '/jobs'];
    const isSilent = silentRoutes.some(route => originalRequest?.url?.includes(route));

    if (error.response?.status !== 401 && !isSilent) {
      const message = error.response?.data?.message || 'Something went wrong';
      toast.error(message);
    } else if (isSilent) {
      console.warn(`[api] Silently failed: ${originalRequest?.url} →`, error.response?.data?.message || error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
