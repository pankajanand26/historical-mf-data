import { useState, useEffect } from 'react';
import { amcApi } from '../services/api';

export const useAMCData = () => {
  const [amcs, setAmcs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [amcData, categoryData] = await Promise.all([
          amcApi.getList(),
          amcApi.getCategories(),
        ]);
        setAmcs(amcData.amcs || []);
        setCategories(categoryData.categories || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch AMC data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { amcs, categories, loading, error };
};

export default useAMCData;
