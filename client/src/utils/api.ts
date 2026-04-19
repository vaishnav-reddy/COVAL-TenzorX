import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const createValuation = async (data: unknown) => {
  const res = await api.post('/valuations/create', data);
  return res.data;
};

export const getValuation = async (id: string) => {
  const res = await api.get(`/valuations/${id}`);
  return res.data;
};

export const getHistory = async (params?: Record<string, string | number>) => {
  const res = await api.get('/valuations/history', { params });
  return res.data;
};

export const getCities = async () => {
  const res = await api.get('/market-data/cities');
  return res.data;
};

export const getCityLocalities = async (city: string) => {
  const res = await api.get(`/market-data/${encodeURIComponent(city)}`);
  return res.data;
};

export const generateReport = async (id: string) => {
  const res = await api.post(`/valuations/${id}/report`);
  return res.data;
};

export default api;
