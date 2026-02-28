import { useState, useRef, useEffect } from 'react';

/**
 * Export button with dropdown for CSV/JSON export.
 * Adapted for light theme.
 */
const ExportButton = ({ data, analyticsData, activeTab }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const exportCSV = () => {
    if (!data) return;
    let csv = '';
    const funds = data.funds ?? [];
    const benchWin = data.benchmark_windows?.[0];

    if (activeTab === 'returns' && benchWin) {
      // Export rolling returns data
      csv = 'Date,Benchmark,' + funds.map((f) => f.scheme_name.replace(/,/g, '')).join(',') + '\n';
      const map = new Map();
      for (const pt of benchWin.data) {
        map.set(pt.date, { date: pt.date, benchmark: pt.value });
      }
      for (const fund of funds) {
        const fWin = fund.windows?.find((w) => w.window === benchWin.window);
        if (fWin) {
          for (const pt of fWin.data) {
            const row = map.get(pt.date) ?? { date: pt.date };
            row[`fund_${fund.scheme_code}`] = pt.value;
            map.set(pt.date, row);
          }
        }
      }
      const rows = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
      for (const row of rows) {
        csv += `${row.date},${row.benchmark ?? ''},${funds.map((f) => row[`fund_${f.scheme_code}`] ?? '').join(',')}\n`;
      }
    } else if (activeTab === 'drawdown' && analyticsData) {
      // Export drawdown data
      csv = 'Fund,Max Drawdown %,Peak Date,Trough Date,Duration Days,Recovery Date,Recovery Days\n';
      if (analyticsData.benchmark_drawdown) {
        const bd = analyticsData.benchmark_drawdown;
        csv += `${analyticsData.benchmark_name.replace(/,/g, '')},${bd.max_drawdown ?? ''},${bd.peak_date ?? ''},${bd.trough_date ?? ''},${bd.drawdown_duration_days ?? ''},${bd.recovery_date ?? ''},${bd.recovery_days ?? ''}\n`;
      }
      for (const f of analyticsData.funds ?? []) {
        const dd = f.drawdown;
        csv += `${f.scheme_name.replace(/,/g, '')},${dd.max_drawdown ?? ''},${dd.peak_date ?? ''},${dd.trough_date ?? ''},${dd.drawdown_duration_days ?? ''},${dd.recovery_date ?? ''},${dd.recovery_days ?? ''}\n`;
      }
    } else {
      // Generic export for other tabs
      csv = 'Section,Note\n';
      csv += `${activeTab},Export available for Returns and Drawdown tabs\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mf_analysis_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportJSON = () => {
    const exportData = {
      rolling_returns: data,
      fund_analytics: analyticsData,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mf_analysis_full_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  if (!data) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 
                   bg-white border border-gray-300 rounded-lg shadow-sm
                   hover:bg-gray-50 hover:border-gray-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>Export</span>
        <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
        >
          <div className="py-1">
            <button
              onClick={exportCSV}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Active Tab (CSV)
            </button>
            <button
              onClick={exportJSON}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Full Data (JSON)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
