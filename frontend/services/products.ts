import { api } from './api';
import { Product } from '@/types';

export const productsService = {
  getAll: async (skip: number = 0, limit: number = 100) => {
    const response = await api.get(`/products/?skip=${skip}&limit=${limit}`);
    return response.data as Product[];
  },
  
  create: async (data: Partial<Product>) => {
    const response = await api.post('/products/', data);
    return response.data as Product;
  }
};
