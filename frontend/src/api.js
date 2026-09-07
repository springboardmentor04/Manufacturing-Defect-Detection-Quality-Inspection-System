// Central API client. Change API_BASE if the backend runs on a different host/port.
const API_BASE = window.VISIONINSPECT_API_BASE || "https://manufacturing-defect-detection-quality.onrender.com";

export const Auth = {
  getToken: () => localStorage.getItem('vi_token'),
  getUser: () => {
    const raw = localStorage.getItem('vi_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession: (token, user) => {
    localStorage.setItem('vi_token', token);
    localStorage.setItem('vi_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('vi_token');
    localStorage.removeItem('vi_user');
  },
  isLoggedIn: () => !!localStorage.getItem('vi_token'),
};

async function apiRequest(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/api/auth/login') {
      Auth.clear();
    }
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const Api = {
  register: (payload) => apiRequest('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiRequest('/api/auth/login', { method: 'POST', body: payload }),
  me: () => apiRequest('/api/auth/me'),

  uploadProduct: (formData) => apiRequest('/api/inspections/upload', { method: 'POST', body: formData, isForm: true }),
  runInspection: (productId) => apiRequest(`/api/inspections/run/${productId}`, { method: 'POST' }),
  listInspections: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/inspections${qs ? `?${qs}` : ''}`);
  },
  getInspection: (id) => apiRequest(`/api/inspections/${id}`),

  summary: () => apiRequest('/api/analytics/summary'),
  defectBreakdown: () => apiRequest('/api/analytics/defect-breakdown'),
  trends: (days = 14) => apiRequest(`/api/analytics/trends?days=${days}`),
  productionLines: () => apiRequest('/api/analytics/production-lines'),

  reports: (days = 30) => apiRequest(`/api/reports?days=${days}`),
  reportDetail: (date) => apiRequest(`/api/reports/${date}`),

  fileUrl: (relPath) => `${API_BASE}${relPath}`,
};
