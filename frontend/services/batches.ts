import { api } from './api';
import { Batch } from '@/types';

export interface CreateBatchInput {
  batch_number: string;
  product_id: number;
}

export const batchesService = {
  getAll: async (skip: number = 0, limit: number = 100): Promise<Batch[]> => {
    const response = await api.get(`/batches/?skip=${skip}&limit=${limit}`);
    return Array.isArray(response.data) ? (response.data as Batch[]) : [];
  },
  
  getById: async (id: number): Promise<Batch> => {
    const response = await api.get(`/batches/${id}`);
    return response.data as Batch;
  },

  create: async (data: CreateBatchInput): Promise<Batch> => {
    const payload = {
      batch_number: data.batch_number.trim(),
      product_id: Number(data.product_id),
    };
    const response = await api.post('/batches/', payload);
    return response.data as Batch;
  }
};
