import { useState } from 'react';
import { analysisApi } from '../services/api';

export const useMetrics = () => {
  const [metrics, setMetrics] = useState([]);
  const [cumulativeReturns, setCumulativeReturns] = useState({});
  const [benchmarkUsed, setBenchmarkUsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = async (params) => {
    if (!params.amcs || params.amcs.length === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await analysisApi.compare(params);
      setMetrics(data.metrics || []);
      setCumulativeReturns(data.cumulative_returns || {});
      setBenchmarkUsed(data.benchmark_used);
    } catch (err) {
      setError(err.message || 'Failed to fetch metrics');
      setMetrics([]);
      setCumulativeReturns({});
    } finally {
      setLoading(false);
    }
  };

  const clearMetrics = () => {
    setMetrics([]);
    setCumulativeReturns({});
    setBenchmarkUsed(null);
    setError(null);
  };

  return {
    metrics,
    cumulativeReturns,
    benchmarkUsed,
    loading,
    error,
    fetchMetrics,
    clearMetrics,
  };
};

export default useMetrics;
