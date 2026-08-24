import { api } from './api';

export const uploadService = {
  async uploadImage(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    // Note: fetch doesn't natively report upload progress; onProgress is a
    // hook point for swapping in XHR/axios later without touching callers.
    if (onProgress) onProgress(0);
    const result = await api.post('/inspection/upload', formData);
    if (onProgress) onProgress(100);
    return result;
  },

  async getInspectionHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/inspection/history${query ? `?${query}` : ''}`);
  },

  async getInspectionById(id) {
    return api.get(`/inspection/${id}`);
  },
};
