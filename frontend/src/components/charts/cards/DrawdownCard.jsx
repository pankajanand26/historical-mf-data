import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { FUND_COLORS, BENCHMARK_COLOR } from '../../../utils/constants';
import { shortName, tickFormatter } from '../../../utils/formatters';

const DrawdownCard = ({
  funds,
  analyticsData,
  analyticsLoading,
  allStats,
  benchmarkName,
}) => {
  // Build combined drawdown time-series data for chart
  // Each row: { date, fund_123_dd, fund_456_dd, benchmarkDD }
  const buildCombinedDDData = () => {
    if (!allStats || allStats.length === 0) return [];
    
    // Use first fund's ddSeries dates as reference
    const refSeries = allStats[0]?.ddSeries ?? [];
    if (refSeries.length === 0) return [];
    
    return refSeries.map((row, idx) => {
      const combined = { date: row.date, benchmarkDD: row.benchmarkDD };
      allStats.forEach((stat) => {
        const ddRow = stat.ddSeries[idx];
        if (ddRow) {
          combined[`fund_${stat.fund.scheme_code}_dd`] = ddRow.fundDD;
        }
      });
      return combined;
    });
  };

  const ddChartData = buildCombinedDDData();
  const hasChartData = ddChartData.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Drawdown Profile</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Maximum peak-to-trough decline and recovery statistics over the selected date range
        </p>
      </div>

      {/* Drawdown Time-Series Chart */}
      {hasChartData && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Drawdown Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={ddChartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <defs>
                {allStats.map((stat, idx) => (
                  <linearGradient key={stat.fund.scheme_code} id={`ddGrad_${stat.fund.scheme_code}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={FUND_COLORS[idx % FUND_COLORS.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={FUND_COLORS[idx % FUND_COLORS.length]} stopOpacity={0.05} />
                  </linearGradient>
                ))}
                <linearGradient id="ddGrad_bench" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BENCHMARK_COLOR} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={BENCHMARK_COLOR} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={tickFormatter}
                tick={{ fontSize: 10, fill: '#6b7280' }} 
                tickLine={false} 
                interval="preserveStartEnd" 
              />
              <YAxis 
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 10, fill: '#6b7280' }} 
                tickLine={false} 
                axisLine={false}
                domain={['dataMin - 5', 0]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value, name) => [`${value?.toFixed(2)}%`, name]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
              />
              <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
              
              {/* Benchmark drawdown area */}
              <Area
                type="monotone"
                dataKey="benchmarkDD"
                name={benchmarkName ? shortName(benchmarkName) : 'Benchmark'}
                stroke={BENCHMARK_COLOR}
                fill="url(#ddGrad_bench)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
              
              {/* Fund drawdown areas */}
              {allStats.map((stat, idx) => (
                <Area
                  key={stat.fund.scheme_code}
                  type="monotone"
                  dataKey={`fund_${stat.fund.scheme_code}_dd`}
                  name={shortName(stat.fund.scheme_name)}
                  stroke={FUND_COLORS[idx % FUND_COLORS.length]}
                  fill={`url(#ddGrad_${stat.fund.scheme_code})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Drawdown = % decline from rolling peak. Lower (more negative) is worse.
          </p>
        </div>
      )}

      {analyticsLoading && (
        <div className="flex items-center gap-3 py-6 justify-center text-gray-400 text-sm">
          <span className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          Computing drawdown statistics…
        </div>
      )}

      {!analyticsLoading && !analyticsData && (
        <p className="text-sm text-gray-400 py-4 text-center">Drawdown data not available.</p>
      )}

      {!analyticsLoading && analyticsData && (() => {
        const rows = [
          {
            name: shortName(analyticsData.benchmark_name),
            color: BENCHMARK_COLOR,
            isBenchmark: true,
            dd: analyticsData.benchmark_drawdown,
          },
          ...analyticsData.funds.map((f) => {
            const idx = funds.findIndex((fd) => fd.scheme_code === f.scheme_code);
            return {
              name: shortName(f.scheme_name),
              color: idx >= 0 ? FUND_COLORS[idx % FUND_COLORS.length] : '#6b7280',
              isBenchmark: false,
              dd: f.drawdown,
            };
          }),
        ];

        return (
          <div className="overflow-x-auto">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Maximum Drawdown Statistics</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund / Benchmark</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Max Drawdown</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Peak</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Trough</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Duration (days)</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Recovery Date</th>
                  <th className="text-right font-medium text-gray-500 pb-2 pl-3">Recovery (days)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(({ name, color, isBenchmark, dd }) => (
                  <tr key={name} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 min-w-0">
                        {isBenchmark
                          ? <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border-2" style={{ borderColor: color, backgroundColor: 'white' }} />
                          : <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        }
                        <span className="font-medium text-gray-800 truncate" title={name}>{name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Mini bar proportional to severity */}
                        <div className="hidden sm:block w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-rose-400"
                            style={{ width: `${Math.min(100, Math.abs(dd.max_drawdown))}%` }}
                          />
                        </div>
                        <span className="font-semibold text-rose-600 tabular-nums">
                          {dd.max_drawdown != null ? `${dd.max_drawdown.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600 tabular-nums text-xs">{dd.peak_date ?? '—'}</td>
                    <td className="py-3 px-3 text-right text-gray-600 tabular-nums text-xs">{dd.trough_date ?? '—'}</td>
                    <td className="py-3 px-3 text-right text-gray-700 font-medium tabular-nums">
                      {dd.drawdown_duration_days > 0 ? dd.drawdown_duration_days : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-xs tabular-nums">
                      {dd.recovery_date
                        ? <span className="text-emerald-600 font-medium">{dd.recovery_date}</span>
                        : <span className="text-amber-600 font-medium">Not recovered</span>
                      }
                    </td>
                    <td className="py-3 pl-3 text-right font-medium tabular-nums">
                      {dd.recovery_days != null
                        ? <span className="text-gray-700">{dd.recovery_days}</span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      <p className="text-xs text-gray-300 mt-4">
        Max Drawdown = largest peak-to-trough decline in NAV over the selected period. Duration = calendar days from peak to trough. Recovery = days from trough to regain peak NAV (blank if not yet recovered).
      </p>
    </div>
  );
};

export default DrawdownCard;
