import { useState, useEffect } from 'react';
import { fetchIndexFunds } from '../services/api';

export function useIndexFunds() {
  const [indexFunds, setIndexFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchIndexFunds()
      .then((res) => setIndexFunds(res.results ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { funds: indexFunds, loading, error };
}
