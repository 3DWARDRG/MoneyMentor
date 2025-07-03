import api from './api';
import { saveToken, removeToken } from './authStorage';

export const login = async (email: string, password: string) => {
  const res = await api.post('/auth/login', { email, password });
  await saveToken(res.data.token);
  return res.data;
};

export const logout = async () => {
  await removeToken();
};

export const register = async (userData: any) => {
  const res = await api.post('/auth/register', userData);
  return res.data;
};
