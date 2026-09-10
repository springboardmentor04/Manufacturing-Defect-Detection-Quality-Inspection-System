import axios from 'axios';

// Resolve Backend and API URLs from environment or production Render default
const rawEnvUrl = 
  process.env.NEXT_PUBLIC_API_URL || 
  process.env.VITE_API_URL || 
  process.env.NEXT_PUBLIC_BACKEND_URL || 
  (typeof window !== 'undefined' && (window as any).__ENV?.VITE_API_URL) ||
  'https://vision-ai-inspect.onrender.com';

const sanitizedBase = rawEnvUrl.replace(/\/+$/, '');

// Clean API Base URL (ending in /api)
export const API_URL = sanitizedBase.endsWith('/api') 
  ? sanitizedBase 
  : `${sanitizedBase}/api`;

// Clean Base URL for uploaded static assets (without /api)
export const BACKEND_URL = API_URL.replace(/\/api\/?$/, '');

export const getAssetUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.replace(/^\//, '');
  return `${BACKEND_URL}/${cleanPath}`;
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
