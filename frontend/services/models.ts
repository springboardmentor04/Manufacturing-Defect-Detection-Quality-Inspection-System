import { api } from './api';
import { ModelVersion } from '@/types';

export const modelsService = {
  getAll: async () => {
    const response = await api.get('/models/');
    return response.data as ModelVersion[];
  },
  
  activate: async (id: number) => {
    const response = await api.post(`/models/${id}/activate`);
    return response.data;
  }
};
