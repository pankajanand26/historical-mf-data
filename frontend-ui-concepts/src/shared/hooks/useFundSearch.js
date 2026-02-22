import { useState, useCallback } from 'react';
import { searchSchemes } from '../services/api';

export function useFundSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debounceTimer, setDebounceTimer] = useState(null);

  const search = useCallback((q) => {
    setQuery(q);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!q || q.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
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
    setDebounceTimer(timer);
  }, [debounceTimer]);

  const clear = useCallback(() => { setQuery(''); setResults([]); }, []);

  return { query, results, loading, error, search, clear };
}
