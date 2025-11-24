import { useAuthStore } from '@/store/useAuthStore';
import api from './api';
import { useUserForm } from '@/store/useUserForm';


export const getProfile = async () => {
  const res = await api.get('/users/me');
  return res.data;
};

/*************  ✨ Windsurf Command 🌟  *************/
export interface RegisterUserData {
  names: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  type: string;
}

export const register = async (userData: RegisterUserData) => {
/*******  557689ea-7a8f-4fff-b2d7-79496762d3b5  *******/
  const res = await api.post('/users', userData);
  return res.data;
};