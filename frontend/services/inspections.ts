import { api } from './api';
import { Inspection } from '@/types';

export const inspectionsService = {
  getAll: async (skip: number = 0, limit: number = 100) => {
    const response = await api.get(`/inspections/?skip=${skip}&limit=${limit}`);
    return response.data as Inspection[];
  },
  
  getOne: async (id: number) => {
    const response = await api.get(`/inspections/${id}`);
    return response.data as Inspection;
  },

  createAndRun: async (productId: number, batchId: number | null, file: File) => {
    const formData = new FormData();
    formData.append('product_id', productId.toString());
    if (batchId) {
      formData.append('batch_id', batchId.toString());
    }
    formData.append('file', file);

    const response = await api.post('/inspections/run', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as Inspection;
  },

  overrideDecision: async (id: number, finalDecision: string, overrideReason: string) => {
    const response = await api.post(`/inspections/${id}/override`, {
      final_decision: finalDecision,
      override_reason: overrideReason
    });
    return response.data as Inspection;
  }
};
