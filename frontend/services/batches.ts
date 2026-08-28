import { api } from './api';
import { Batch } from '@/types';

export const batchesService = {
  getAll: async (skip: number = 0, limit: number = 100) => {
    const response = await api.get(`/batches/?skip=${skip}&limit=${limit}`);
    return response.data as Batch[];
  },
  
  create: async (data: Partial<Batch>) => {
    const response = await api.post('/batches/', data);
    return response.data as Batch;
  }
};
