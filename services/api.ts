import axios from 'axios';
import { getToken } from './authStorage';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1/',
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
