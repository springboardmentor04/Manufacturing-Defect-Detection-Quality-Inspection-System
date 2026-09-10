import axios from 'axios';

export const API_BASE_URL = 'https://visioninspect-backend-h6pt.onrender.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token to every request if present
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401 unauthenticated responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup') && !currentPath.startsWith('/register')) {
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role_name: 'quality_engineer' | 'factory_supervisor' | string;
}

export interface ImageDetail {
  id: number;
  uploaded_by: number;
  uploader_username?: string | null;
  filename: string;
  filepath: string;
  upload_source: string;
  status: string; // 'pending' | 'processed' | 'rejected'
  uploaded_at: string;
  inspection_id?: number | null;
  inspection_status?: string | null;
  defect_count?: number;
  decision?: string | null;
}

export interface DefectItem {
  id: number;
  inspection_id: number;
  defect_type: string;
  confidence_score: number;
  bbox_x?: number | null;
  bbox_y?: number | null;
  bbox_width?: number | null;
  bbox_height?: number | null;
  size_score?: number | null;
  location_score?: number | null;
  type_score?: number | null;
  severity_score?: number | null;
  severity_level?: 'Critical' | 'High' | 'Medium' | 'Low' | string | null;
  detected_at: string;
}

export interface ImageQualityReport {
  resolution?: { width: number; height: number };
  blur_score?: number;
  brightness_mean?: number;
  brightness_std?: number;
  contrast_score?: number;
  is_acceptable?: boolean;
  rejection_reason?: string | null;
}

export interface InspectionDetailData {
  inspection_id: number;
  status: string; // 'queued' | 'completed' | 'failed' | 'needs_review' | 'rejected'
  defect_count: number;
  decision?: 'pass' | 'fail' | 'pending' | string | null;
  decided_at?: string | null;
  image: ImageDetail;
  defects: DefectItem[];
  quality_report?: ImageQualityReport | null;
}

export interface InspectionListItem {
  id: number;
  image_id: number;
  filename?: string | null;
  filepath?: string | null;
  status: string;
  defect_count?: number;
  decision?: 'pass' | 'fail' | 'pending' | string | null;
  decided_at?: string | null;
  created_at: string;
  uploader_username?: string | null;
}

// Milestone 3 Report and Analytics Interfaces
export interface QualitySummaryReport {
  total_inspections: number;
  total_passed: number;
  total_failed: number;
  pass_rate_percent: number;
  total_defects_found: number;
  most_common_defect_type?: string | null;
  avg_severity_score: number;
}

export interface DefectTrendItem {
  period_label: string;
  total_inspections: number;
  total_defects: number;
  pass_count: number;
  fail_count: number;
}

export interface DefectTypeBreakdownItem {
  defect_type: string;
  count: number;
  avg_severity_score: number;
}

export interface SeverityDistributionData {
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

export const setAuthData = (token: string, user: UserProfile) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }
};

export const getCurrentUserFromStorage = (): UserProfile | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

export const getErrorMessage = (err: any, fallback: string = 'An error occurred'): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map((d: any) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d))).join(', ');
  }
  if (detail && typeof detail === 'object') {
    return detail.msg || JSON.stringify(detail);
  }
  return err?.message || fallback;
};

// API Services
export const uploadImages = async (files: File[], onProgress?: (pct: number) => void): Promise<ImageDetail[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await api.post('/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return response.data;
};

export const getImages = async (statusFilter?: string, limit: number = 50, offset: number = 0): Promise<ImageDetail[]> => {
  const params: any = { limit, offset };
  if (statusFilter) params.status = statusFilter;
  const response = await api.get('/images', { params });
  return response.data;
};

export const getInspections = async (statusFilter?: string): Promise<InspectionListItem[]> => {
  const params = statusFilter ? { status: statusFilter } : {};
  const response = await api.get('/inspections', { params });
  return response.data;
};

export const getInspectionDefects = async (inspectionId: number): Promise<InspectionDetailData> => {
  const response = await api.get(`/inspections/${inspectionId}/defects`);
  return response.data;
};

export const analyzeInspection = async (inspectionId: number): Promise<InspectionDetailData> => {
  const response = await api.post(`/inspections/${inspectionId}/analyze`);
  return response.data;
};

export const reinspectInspection = async (inspectionId: number): Promise<InspectionDetailData> => {
  const response = await api.post(`/inspections/${inspectionId}/reinspect`);
  return response.data;
};

export const analyzeBatch = async (inspectionIds?: number[]) => {
  const payload = inspectionIds && inspectionIds.length > 0 ? { inspection_ids: inspectionIds } : {};
  const response = await api.post('/inspections/analyze-batch', payload);
  return response.data;
};

// Milestone 3 Reports & Analytics API calls
export const getQualitySummaryReport = async (startDate?: string, endDate?: string): Promise<QualitySummaryReport> => {
  const params: any = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const response = await api.get('/reports/quality-summary', { params });
  return response.data;
};

export const exportQualitySummaryCsv = async (startDate?: string, endDate?: string): Promise<Blob> => {
  const params: any = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const response = await api.get('/reports/quality-summary/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

export const getDefectTrends = async (
  period: 'daily' | 'weekly' = 'daily',
  startDate?: string,
  endDate?: string
): Promise<DefectTrendItem[]> => {
  const params: any = { period };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const response = await api.get('/analytics/defect-trends', { params });
  return response.data;
};

export const getDefectTypeBreakdown = async (
  startDate?: string,
  endDate?: string
): Promise<DefectTypeBreakdownItem[]> => {
  const params: any = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const response = await api.get('/analytics/defect-type-breakdown', { params });
  return response.data;
};

export const getSeverityDistribution = async (
  startDate?: string,
  endDate?: string
): Promise<SeverityDistributionData> => {
  const params: any = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const response = await api.get('/analytics/severity-distribution', { params });
  return response.data;
};
