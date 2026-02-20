import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const amcApi = {
  getList: async () => {
    const response = await api.get('/api/amc/list');
    return response.data;
  },

  getSchemes: async (amcName, category = null) => {
    const params = category ? { category } : {};
    const response = await api.get(`/api/amc/${encodeURIComponent(amcName)}/schemes`, { params });
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/api/amc/categories');
    return response.data;
  },
};

export const analysisApi = {
  compare: async (params) => {
    const response = await api.post('/api/analysis/compare', params);
    return response.data;
  },

  getMetrics: async (params) => {
    const response = await api.post('/api/analysis/metrics', params);
    return response.data;
  },
};

export const expenseApi = {
  getPairs: async (amcName) => {
    const response = await api.get(`/api/expense/pairs/${encodeURIComponent(amcName)}`);
    return response.data;
  },

  getExpenseDrag: async (amcName, params = {}) => {
    const response = await api.get(`/api/expense/drag/${encodeURIComponent(amcName)}`, { params });
    return response.data;
  },
};

export default api;
