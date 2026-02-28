import { computeKPIs, computeAllStats } from '../../utils/statsUtils';
import { buildChartData, rfPeriodPct } from '../../utils/chartUtils';
import { WINDOWS } from '../../utils/constants';

/**
 * KPI summary strip showing key metrics at a glance.
 * Positioned below header, above tabs.
 * Also contains global window selector (1Y/3Y/5Y/10Y).
 */
const KpiStrip = ({ data, analyticsData, rfRate, activeWindow, setActiveWindow }) => {
  const avail = data?.benchmark_windows?.map((bw) => bw.window) ?? [];
  // Use global activeWindow if available, fallback to first available
  const curWin = avail.includes(activeWindow) ? activeWindow : avail[0] ?? '3y';
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = buildChartData(data?.funds ?? [], benchWin, 'absolute');
  const allStats = computeAllStats(data?.funds ?? [], chartData, rfPct);
  const kpis = computeKPIs(allStats, analyticsData);

  if (kpis.length === 0 && avail.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-4 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* KPIs section */}
        <div className="flex items-center gap-6 overflow-x-auto flex-1 min-w-0">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-medium flex-shrink-0">
            KPIs ({curWin.toUpperCase()})
          </span>
          {kpis.map((kpi, i) => (
            <div key={i} className="flex-shrink-0 flex items-center gap-2">
              <span className="text-xs text-gray-500">{kpi.label}:</span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  kpi.positive ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {kpi.value}
              </span>
              <span className="text-[10px] text-gray-400 max-w-[120px] truncate" title={kpi.sub}>
                {kpi.sub}
              </span>
            </div>
          ))}
        </div>

        {/* Window selector */}
        {avail.length > 0 && setActiveWindow && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mr-1">
              Window
            </span>
            {avail.map((w) => {
              const label = WINDOWS.find((x) => x.id === w)?.label ?? w.toUpperCase();
              const isActive = curWin === w;
              return (
                <button
                  key={w}
                  onClick={() => setActiveWindow(w)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KpiStrip;
