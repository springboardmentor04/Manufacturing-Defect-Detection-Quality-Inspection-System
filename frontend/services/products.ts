import { api } from './api';
import { Product } from '@/types';

export interface CreateProductInput {
  name: string;
  product_code?: string;
  description?: string;
  production_line?: string;
}

export const productsService = {
  getAll: async (skip: number = 0, limit: number = 100): Promise<Product[]> => {
    const response = await api.get(`/products/?skip=${skip}&limit=${limit}`);
    return Array.isArray(response.data) ? (response.data as Product[]) : [];
  },
  
  getById: async (id: number): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data as Product;
  },

  create: async (data: CreateProductInput): Promise<Product> => {
    const payload: Record<string, any> = {
      name: data.name ? data.name.trim() : '',
    };
    if (data.product_code !== undefined && data.product_code !== null && data.product_code.trim() !== '') {
      payload.product_code = data.product_code.trim();
    }
    if (data.description !== undefined && data.description !== null && data.description.trim() !== '') {
      payload.description = data.description.trim();
    }
    if (data.production_line !== undefined && data.production_line !== null && data.production_line.trim() !== '') {
      payload.production_line = data.production_line.trim();
    }
    const response = await api.post('/products/', payload);
    return response.data as Product;
  }
};

