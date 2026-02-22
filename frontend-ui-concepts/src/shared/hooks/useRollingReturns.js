import { useState, useCallback } from 'react';
import { fetchRollingReturns } from '../services/api';

export function useRollingReturns() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async ({ schemeCodes, benchmarkCode, windows, startDate, endDate }) => {
    setLoading(true); setError(null); setData(null);
    try {
      const payload = {
        scheme_codes: schemeCodes, benchmark_code: benchmarkCode, windows,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      };
      setData(await fetchRollingReturns(payload));
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d) => d.msg).join('; ')
        : detail || err.message || 'Failed to fetch rolling returns');
    } finally { setLoading(false); }
  }, []);

  const reset = useCallback(() => { setData(null); setError(null); }, []);
  return { data, loading, error, fetch, reset };
}
