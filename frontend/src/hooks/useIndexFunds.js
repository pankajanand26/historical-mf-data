import { useState, useEffect } from 'react';
import { fetchIndexFunds } from '../services/api';

export function useIndexFunds() {
  const [indexFunds, setIndexFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchIndexFunds();
        if (!cancelled) setIndexFunds(data.results || []);
      } catch (err) {
        if (!cancelled)
          setError(err?.response?.data?.detail || err.message || 'Failed to load index funds');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return { indexFunds, loading, error };
}
