import { useState, useCallback, useRef } from 'react';
import { searchSchemes } from '../services/api';

export function useFundSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q || q.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchSchemes(q, 20);
        setResults(res.results ?? []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const clear = useCallback(() => { setQuery(''); setResults([]); }, []);

  return { query, results, loading, error, search, clear };
}
