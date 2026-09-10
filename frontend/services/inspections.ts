import { api } from './api';
import { Inspection } from '@/types';

export const inspectionsService = {
  getAll: async (skip: number = 0, limit: number = 100): Promise<Inspection[]> => {
    const response = await api.get(`/inspections/?skip=${skip}&limit=${limit}`);
    return Array.isArray(response.data) ? (response.data as Inspection[]) : [];
  },
  
  getOne: async (id: number): Promise<Inspection> => {
    const response = await api.get(`/inspections/${id}`);
    return response.data as Inspection;
  },

  createAndRun: async (productId: number, batchId: number | null, file: File): Promise<Inspection> => {
    const formData = new FormData();
    formData.append('product_id', productId.toString());
    if (batchId) {
      formData.append('batch_id', batchId.toString());
    }
    formData.append('file', file);

    const response = await api.post('/inspections/run', formData);
    return response.data as Inspection;
  },

  overrideDecision: async (id: number, finalDecision: string, overrideReason: string): Promise<any> => {
    const response = await api.post(`/inspections/${id}/override`, {
      final_decision: finalDecision,
      override_reason: overrideReason,
    });
    return response.data;
  }
};
