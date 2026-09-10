import { api } from './api';

export const reportsService = {
  getRecent: async (limit: number = 20) => {
    const response = await api.get(`/reports/?limit=${limit}`);
    return response.data;
  },
  
  generate: async (reportType: string, dateRange: string) => {
    const response = await api.post('/reports/generate', {
      report_type: reportType,
      date_range: dateRange
    });
    return response.data;
  }
};
