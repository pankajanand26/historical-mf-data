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

/**
 * Compute max drawdown and recovery stats for a set of funds vs a benchmark.
 * @param {{
 *   scheme_codes: number[],
 *   benchmark_code: number,
 *   start_date?: string,
 *   end_date?: string
 * }} payload
 * @returns {Promise<import('./types').FundAnalyticsResponse>}
 */
export const fetchFundAnalytics = async (payload) => {
  const { data } = await api.post('/api/performance/fund-analytics', payload);
  return data;
};

// ---------- Portfolio Optimiser ----------

/**
 * Fetch normalised month-end NAV growth for all 6 asset class proxies.
 * @param {{ start_date?: string, end_date?: string }} payload
 */
export const fetchPortfolioNav = async (payload = {}) => {
  const { data } = await api.post('/api/portfolio/nav', payload, { timeout: 120_000 });
  return data;
};

/**
 * Fetch full-period + rolling 12-month correlation matrix.
 * @param {{ start_date?: string, end_date?: string }} payload
 */
export const fetchCorrelation = async (payload = {}) => {
  const { data } = await api.post('/api/portfolio/correlation', payload, { timeout: 120_000 });
  return data;
};

/**
 * Run MVO + Monte Carlo optimisation and return results.
 * @param {{ start_date?: string, end_date?: string }} payload
 */
export const fetchOptimize = async (payload = {}) => {
  const { data } = await api.post('/api/portfolio/optimize', payload, { timeout: 120_000 });
  return data;
};

export default api;
