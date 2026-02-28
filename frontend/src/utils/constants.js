// ─── Constants for frontend-idea1 ─────────────────────────────────────────────

// Fund colors (up to 5 funds)
export const FUND_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#d97706', // amber
  '#7c3aed', // violet
  '#db2777', // pink
];

// Benchmark color (green, dashed line)
export const BENCHMARK_COLOR = '#16a34a';

// Maximum number of funds that can be selected
export const MAX_FUNDS = 5;

// Debounce delay for search input (ms)
export const DEBOUNCE_MS = 350;

// Rolling window options
export const WINDOWS = [
  { id: '1y', label: '1Y', days: 365 },
  { id: '3y', label: '3Y', days: 1095 },
  { id: '5y', label: '5Y', days: 1825 },
  { id: '10y', label: '10Y', days: 3650 },
];

// Date range presets
export const DATE_PRESETS = [
  { id: '1y', label: '1Y' },
  { id: '3y', label: '3Y' },
  { id: '5y', label: '5Y' },
  { id: '10y', label: '10Y' },
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'Custom' },
];

// Default risk-free rate (6.5% annual)
export const DEFAULT_RF_RATE = 0.065;

// Tab definitions for the main chart view
export const TABS = [
  { id: 'returns', label: 'Returns' },
  { id: 'performance', label: 'Perf' },
  { id: 'capture', label: 'Capture' },
  { id: 'drawdown', label: 'Drawdown' },
  { id: 'scorecard', label: 'Score' },
  { id: 'distribution', label: 'Dist' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'entry-heatmap', label: 'Entry' },
];

// SIP tools grouped separately (accessed via dropdown)
export const SIP_TABS = [
  { id: 'sip', label: 'SIP Planner' },
  { id: 'reverse-sip', label: 'Reverse SIP' },
  { id: 'retirement', label: 'Retirement' },
  { id: 'lumpsum-sip', label: 'Lumpsum vs SIP' },
];
