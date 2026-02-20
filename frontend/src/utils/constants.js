export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const DATE_PRESETS = [
  { label: '1 Year', value: '1y' },
  { label: '3 Years', value: '3y' },
  { label: '5 Years', value: '5y' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

export const PLAN_TYPES = [
  { label: 'All Plans', value: null },
  { label: 'Direct Only', value: 'direct' },
  { label: 'Regular Only', value: 'regular' },
];

export const CHART_COLORS = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#ea580c',
  '#9333ea',
  '#0891b2',
  '#c026d3',
  '#65a30d',
  '#0d9488',
  '#db2777',
];

export const METRIC_LABELS = {
  cagr: 'CAGR',
  sharpe_ratio: 'Sharpe Ratio',
  sortino_ratio: 'Sortino Ratio',
  calmar_ratio: 'Calmar Ratio',
  treynor_ratio: 'Treynor Ratio',
  information_ratio: 'Information Ratio',
  beta: 'Beta',
  alpha: 'Alpha',
  max_drawdown: 'Max Drawdown',
  volatility: 'Volatility',
};

export const METRIC_DESCRIPTIONS = {
  cagr: 'Compound Annual Growth Rate',
  sharpe_ratio: 'Risk-adjusted return (higher is better)',
  sortino_ratio: 'Downside risk-adjusted return (higher is better)',
  calmar_ratio: 'Return vs max drawdown (higher is better)',
  treynor_ratio: 'Excess return per unit of systematic risk',
  information_ratio: 'Active return vs tracking error',
  beta: 'Systematic risk relative to benchmark',
  alpha: 'Excess return over benchmark',
  max_drawdown: 'Largest peak-to-trough decline',
  volatility: 'Annualized standard deviation of returns',
};
