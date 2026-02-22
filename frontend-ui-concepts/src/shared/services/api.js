import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const api = axios.create({ baseURL: BASE_URL, timeout: 60000 });

export const searchSchemes = async (query, limit = 20) => {
  const { data } = await api.get('/api/schemes/search', { params: { q: query, limit } });
  return data;
};

export const fetchIndexFunds = async () => {
  const { data } = await api.get('/api/schemes/index-funds');
  return data;
};

export const fetchRollingReturns = async (payload) => {
  const { data } = await api.post('/api/performance/rolling-returns', payload);
  return data;
};

export const fetchFundAnalytics = async (payload) => {
  const { data } = await api.post('/api/performance/fund-analytics', payload);
  return data;
};

export default api;
