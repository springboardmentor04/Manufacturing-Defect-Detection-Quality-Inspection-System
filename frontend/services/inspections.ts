import { api, BACKEND_URL } from './api';
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
    if (batchId !== null && batchId !== undefined) {
      formData.append('batch_id', batchId.toString());
    }
    formData.append('file', file);

    const response = await api.post('/inspections/run', formData);
    return response.data as Inspection;
  },

  uploadImage: async (id: number, file: File): Promise<{ message: string; file_path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/inspections/${id}/image`, formData);
    return response.data;
  },

  runPredict: async (id: number): Promise<any> => {
    const response = await api.post(`/inspections/${id}/predict`);
    return response.data;
  },

  getQualityAssessment: async (id: number): Promise<any> => {
    const response = await api.get(`/inspections/${id}/quality-assessment`);
    return response.data;
  },

  overrideDecision: async (id: number, finalDecision: string, overrideReason: string): Promise<Inspection> => {
    const response = await api.post(`/inspections/${id}/override`, {
      final_decision: finalDecision,
      override_reason: overrideReason,
    });
    return response.data as Inspection;
  }
};
