export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return `${(num * 100).toFixed(decimals)}%`;
};

export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return num.toFixed(decimals);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined) return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return `₹${num.toFixed(decimals)}`;
};

export const getMetricColor = (metric, value) => {
  if (value === null || value === undefined) return 'text-gray-400';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'text-gray-400';
  
  if (metric === 'max_drawdown' || metric === 'volatility') {
    return num < 0 ? 'text-red-500' : 'text-green-500';
  }
  
  if (metric === 'beta') {
    return num > 1 ? 'text-orange-500' : 'text-green-500';
  }
  
  return num >= 0 ? 'text-green-500' : 'text-red-500';
};
