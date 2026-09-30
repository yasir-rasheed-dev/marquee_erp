import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  // baseURL: 'https://marque.digitalinsiderinc.com/api',
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    const message = data?.message || error.message || 'Network error';
    return Promise.reject({ message, status, ...data });
  }
);

export default apiClient;