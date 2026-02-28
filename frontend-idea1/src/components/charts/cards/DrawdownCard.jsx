import { FUND_COLORS, BENCHMARK_COLOR } from '../../../utils/constants';
import { shortName } from '../../../utils/formatters';

const DrawdownCard = ({
  funds,
  analyticsData,
  analyticsLoading,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Drawdown Profile</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Maximum peak-to-trough decline and recovery statistics over the selected date range
        </p>
      </div>

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
