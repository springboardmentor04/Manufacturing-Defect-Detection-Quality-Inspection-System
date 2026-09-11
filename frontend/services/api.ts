import axios, { AxiosHeaders } from 'axios';

/**
 * Resolve Backend Base URL and API Endpoint from environment variables or production defaults.
 * Guarantees HTTPS protocol and eliminates hardcoded localhosts in production.
 */
const resolveBackendUrl = (): string => {
  const envUrl = 
    process.env.NEXT_PUBLIC_API_URL || 
    process.env.NEXT_PUBLIC_BACKEND_URL || 
    process.env.VITE_API_URL || 
    (typeof window !== 'undefined' && ((window as any).__ENV?.NEXT_PUBLIC_API_URL || (window as any).__ENV?.VITE_API_URL));

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
      clean = `https://${clean}`;
    }
    return clean;
  }

  // If running in the browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Production Render deployed backend default
      return 'https://vision-ai-inspect.onrender.com';
    }
    return window.location.origin;
  }

  return 'https://vision-ai-inspect.onrender.com';
};

const resolvedBase = resolveBackendUrl();

// Clean Base URL for backend without /api suffix (used for static assets and uploads)
export const BACKEND_URL = resolvedBase.replace(/\/api\/?$/, '').replace(/\/+$/, '');

// Clean API Base URL (ending in /api)
export const API_URL = resolvedBase.endsWith('/api') 
  ? resolvedBase 
  : `${BACKEND_URL}/api`;

/**
 * Resolves static inspection image asset URLs against the backend domain.
 * Never requests images from the frontend Render domain.
 */
export const getAssetUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  const trimmed = path.trim();
  if (
    trimmed.startsWith('http://') || 
    trimmed.startsWith('https://') || 
    trimmed.startsWith('data:') || 
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^\//, '');
  return `${BACKEND_URL}/${cleanPath}`;
};

/**
 * Centralized API error formatter that extracts exact backend detail messages.
 */
export const formatApiError = (error: any, fallbackMessage: string = 'Operation failed. Please verify the backend connection and try again.'): string => {
  if (!error) return fallbackMessage;

  const status = error.response?.status;
  const statusPrefix = status ? `[HTTP ${status}] ` : '';

  // 1. Check for detailed backend response body
  if (error.response?.data) {
    const data = error.response.data;

    // String detail
    if (typeof data.detail === 'string' && data.detail.trim()) {
      return `${statusPrefix}${data.detail.trim()}`;
    }

    // Array of Pydantic validation errors (FastAPI 422)
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      const details = data.detail
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item?.msg) {
            const loc = Array.isArray(item.loc) 
              ? item.loc.filter((l: string) => l !== 'body' && l !== 'form').join(' -> ') 
              : '';
            return loc ? `${loc}: ${item.msg}` : item.msg;
          }
          return JSON.stringify(item);
        })
        .join('; ');
      return `${statusPrefix}Validation Error: ${details}`;
    }

    // Generic message field
    if (typeof data.message === 'string' && data.message.trim()) {
      return `${statusPrefix}${data.message.trim()}`;
    }
  }

  // 2. HTTP Status Code specific descriptions
  if (status) {
    switch (status) {
      case 400:
        return `${statusPrefix}Bad Request: Invalid image format or inspection parameters provided.`;
      case 401:
        return `${statusPrefix}Authentication required. Your session may have expired. Please sign in again.`;
      case 403:
        return `${statusPrefix}Access Forbidden: Your account role does not have permission to perform this inspection action.`;
      case 404:
        return `${statusPrefix}Resource not found on backend.`;
      case 422:
        return `${statusPrefix}Unprocessable Entity: Required parameters missing or invalid format.`;
      case 500:
        return `${statusPrefix}Internal Server Error: AI inference failure. Please check the backend model runtime.`;
      case 502:
      case 503:
      case 504:
        return `${statusPrefix}Backend Service Unavailable: The Render backend service is waking up from idle (cold start). Please wait a moment and retry.`;
    }
  }

  // 3. Network & Connectivity issues
  if (error.code === 'ERR_NETWORK' || error.message?.toLowerCase().includes('network error') || !error.response) {
    return `Network Error: Unable to reach VisionInspect AI backend at ${API_URL}. The service may be starting up or experiencing connectivity delays. Please retry in a few seconds.`;
  }

  // 4. Timeouts
  if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
    return 'Request Timeout: AI model inference took longer than expected. Please retry.';
  }

  return error.message ? `${statusPrefix}${error.message}` : fallbackMessage;
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // 3 minutes for cold-start model warming
});

// Request Interceptor: Attach JWT Token, normalize URLs, handle multipart FormData, and safe logging
api.interceptors.request.use(
  (config) => {
    // Prevent duplicate /api/api prefixes
    if (config.url) {
      if (config.url.startsWith('/api/')) {
        config.url = config.url.replace(/^\/api/, '');
      } else if (config.url === '/api') {
        config.url = '/';
      }
    }

    // When sending FormData (e.g. image uploads), delete Content-Type so browser adds multipart boundary
    if (config.data instanceof FormData) {
      if (config.headers) {
        if (typeof (config.headers as any).delete === 'function') {
          (config.headers as any).delete('Content-Type');
          (config.headers as any).delete('content-type');
        }
        delete (config.headers as any)['Content-Type'];
        delete (config.headers as any)['content-type'];
      }
    }

    // Attach Bearer token from localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        if (typeof (config.headers as any).set === 'function') {
          (config.headers as any).set('Authorization', `Bearer ${token}`);
        } else {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    }

    // Safe development console logging (no passwords or tokens)
    if (process.env.NODE_ENV === 'development') {
      const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
      console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
    }

    return config;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Request Error]', error?.message || error);
    }
    return Promise.reject(error);
  }
);

// Response Interceptor: Safe logging and centralized 401 handling
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.status} ${response.config?.method?.toUpperCase()} ${response.config?.url}`);
    }
    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      const status = error.response?.status || 'NETWORK_ERR';
      const url = error.config?.url || 'unknown';
      console.error(`[API Response Error] ${status} ${error.config?.method?.toUpperCase()} ${url}:`, error.response?.data || error.message);
    }

    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login?session_expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);
