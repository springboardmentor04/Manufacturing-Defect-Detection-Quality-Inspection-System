import { api } from './api';
import { User } from '@/types';

export const authService = {
  login: async (credential: string, password: string) => {
    // Send both email and username so both UserLogin and LoginRequest schemas succeed
    const response = await api.post('/auth/login', {
      email: credential,
      username: credential,
      password: password
    });
    return response.data; // { access_token, token_type }
  },

  register: async (data: { username: string; email: string; password: string; role_name: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data as User;
  },
};
