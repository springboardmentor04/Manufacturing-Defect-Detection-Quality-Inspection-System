import { api } from './api';
import { ModelVersion } from '@/types';

export const modelsService = {
  getAll: async (): Promise<ModelVersion[]> => {
    const response = await api.get('/models/');
    return Array.isArray(response.data) ? (response.data as ModelVersion[]) : [];
  },
  
  activate: async (id: number): Promise<any> => {
    const response = await api.post(`/models/${id}/activate`);
    return response.data;
  }
};
