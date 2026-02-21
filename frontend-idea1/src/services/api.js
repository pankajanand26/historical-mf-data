import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// ---------- Schemes ----------

/**
 * Search funds by name fragment.
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<{results: Array, total: number}>}
 */
export const searchSchemes = async (query, limit = 20) => {
  const { data } = await api.get('/api/schemes/search', {
    params: { q: query, limit },
  });
  return data;
};

/**
 * Fetch all index funds available for benchmark selection.
 * @returns {Promise<{results: Array, total: number}>}
 */
export const fetchIndexFunds = async () => {
  const { data } = await api.get('/api/schemes/index-funds');
  return data;
};

// ---------- Performance ----------

/**
 * Compute rolling returns for a scheme vs a benchmark.
 * @param {{
 *   scheme_code: number,
 *   benchmark_code: number,
 *   windows: string[],
 *   start_date?: string,
 *   end_date?: string
 * }} payload
 * @returns {Promise<import('./types').RollingReturnResponse>}
 */
export const fetchRollingReturns = async (payload) => {
  const { data } = await api.post('/api/performance/rolling-returns', payload);
  return data;
};

export default api;
