import { api } from './api';

export const analyticsService = {
  getSummary: async (period: string) => (await api.get(`/analytics/summary?period=${period}`)).data,
  getTrends: async (period: string) => (await api.get(`/analytics/trends?period=${period}`)).data,
  getQualityReport: async (period: string) => (await api.get(`/analytics/quality-report?period=${period}`)).data,
};
