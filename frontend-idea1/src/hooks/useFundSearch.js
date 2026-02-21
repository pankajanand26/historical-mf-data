import { useState, useCallback, useRef } from 'react';
import { searchSchemes } from '../services/api';

const DEBOUNCE_MS = 350;

export function useFundSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const search = useCallback((value) => {
    setQuery(value);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value || value.trim().length < 2) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchSchemes(value.trim(), 25);
        setResults(data.results || []);
      } catch (err) {
        setError(err?.response?.data?.detail || err.message || 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return { query, results, loading, error, search, clear };
}
