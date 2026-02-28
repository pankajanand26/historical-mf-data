import { computeKPIs, computeAllStats } from '../../utils/statsUtils';
import { buildChartData, rfPeriodPct } from '../../utils/chartUtils';

/**
 * KPI summary strip showing key metrics at a glance.
 * Positioned below header, above tabs.
 */
const KpiStrip = ({ data, analyticsData, rfRate }) => {
  const avail = data?.benchmark_windows?.map((bw) => bw.window) ?? [];
  const curWin = avail.includes('3y') ? '3y' : avail[0] ?? '3y';
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = buildChartData(data?.funds ?? [], benchWin, 'absolute');
  const allStats = computeAllStats(data?.funds ?? [], chartData, rfPct);
  const kpis = computeKPIs(allStats, analyticsData);

  if (kpis.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-4 py-2.5">
      <div className="flex items-center gap-6 overflow-x-auto">
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
    </div>
  );
};

export default KpiStrip;
