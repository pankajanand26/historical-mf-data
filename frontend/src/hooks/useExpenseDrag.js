import { useState } from 'react';
import { expenseApi } from '../services/api';

export const useExpenseDrag = () => {
  const [expenseDragData, setExpenseDragData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExpenseDrag = async (amcName, params = {}) => {
    if (!amcName) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await expenseApi.getExpenseDrag(amcName, params);
      setExpenseDragData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch expense drag data');
      setExpenseDragData(null);
    } finally {
      setLoading(false);
    }
  };

  const clearExpenseDrag = () => {
    setExpenseDragData(null);
    setError(null);
  };

  return {
    expenseDragData,
    loading,
    error,
    fetchExpenseDrag,
    clearExpenseDrag,
  };
};

export default useExpenseDrag;
