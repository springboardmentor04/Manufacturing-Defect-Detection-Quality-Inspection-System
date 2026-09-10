import { api } from './api';

export const analyticsService = {
  getOverview: async (period?: string) => {
    const url = period ? `/analytics/overview?period=${period}` : '/analytics/overview';
    const response = await api.get(url);
    return response.data;
  },
  getSummary: async (period: string = 'TODAY') => {
    try {
      const response = await api.get(`/analytics/overview?period=${period}`);
      return response.data;
    } catch {
      const fallback = await api.get('/analytics/overview');
      return fallback.data;
    }
  },
  getTrends: async (period: string = 'TODAY') => {
    const response = await api.get(`/analytics/overview?period=${period}`);
    return response.data;
  },
  getQualityReport: async (period: string = 'TODAY') => {
    const response = await api.get(`/analytics/overview?period=${period}`);
    return response.data;
  },
};
