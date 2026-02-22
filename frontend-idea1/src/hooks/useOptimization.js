import { useState, useCallback } from 'react';
import { fetchOptimize } from '../services/api';

export function useOptimization() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async ({ startDate, endDate } = {}) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const payload = {
        ...(startDate && { start_date: startDate }),
        ...(endDate   && { end_date:   endDate   }),
      };
      const result = await fetchOptimize(payload);
      setData(result);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail.map((d) => d.msg).join('; ')
          : detail || err.message || 'Failed to run optimisation',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setData(null); setError(null); }, []);

  return { data, loading, error, fetch, reset };
}
