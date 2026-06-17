// frontend/src/utils/api.js

import axios from 'axios';
import toast from 'react-hot-toast';


`${API_URL}/api/auth/refresh`

console.log('================================');
console.log('VITE_API_URL:', API_URL);
console.log('MODE:', import.meta.env.MODE);
console.log('================================');

if (!API_URL) {
  console.error(
    '❌ VITE_API_URL is missing. Check Railway Frontend Variables.'
  );
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://skilltech-hub-production.up.railway.app';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('sth_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error)
);

api.interceptors.response.use(
  response => response,

  async error => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('sth_refresh');

        if (!refreshToken) {
          throw new Error('No refresh token found');
        }

        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {
            refreshToken,
          }
        );

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        localStorage.setItem('sth_token', accessToken);
        localStorage.setItem('sth_refresh', newRefreshToken);

        originalRequest.headers.Authorization =
          `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);

        localStorage.removeItem('sth_token');
        localStorage.removeItem('sth_refresh');

        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    const message =
      error.response?.data?.message ||
      'Something went wrong';

    if (error.response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;