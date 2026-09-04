import axios from 'axios';

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL });

// Store token in memory only (not localStorage) to prevent XSS
let authToken = sessionStorage.getItem('token') || null;
if (authToken) api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    sessionStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    sessionStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
}

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),
};

export const inspectionAPI = {
  upload: (formData) => api.post('/api/inspections/upload', formData),
  list: (skip = 0, limit = 20, status = '', category = '') =>
    api.get(`/api/inspections/`, { params: { skip, limit, ...(status && { status }), ...(category && { category }) } }),
  get: (id) => api.get(`/api/inspections/${id}`),
  stats: () => api.get('/api/inspections/stats'),
  categoryStats: () => api.get('/api/inspections/category-stats'),
  trendStats: () => api.get('/api/inspections/trend-stats'),
  simulateCamera: () => api.post('/api/inspections/simulate-camera'),
  inspect: (id, params) => api.post(`/api/inspections/${id}/inspect`, params),
};

export const usersAPI = {
  list: () => api.get('/api/users/'),
  toggleActive: (id) => api.patch(`/api/users/${id}/toggle-active`),
};

export const datasetAPI = {
  mvtecInfo: () => api.get('/api/dataset/mvtec-info'),
  all: () => api.get('/api/dataset/all'),
  get: (id) => api.get(`/api/dataset/${id}`),
};

export default api;
