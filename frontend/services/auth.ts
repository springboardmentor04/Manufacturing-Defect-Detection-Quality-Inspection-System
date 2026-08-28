import { api } from './api';
import { User } from '@/types';

export const authService = {
  login: async (email: string, password: string) => {
    // Backend uses a JSON LoginRequest schema, not OAuth2PasswordRequestForm
    const response = await api.post('/auth/login', {
      username: email,
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
