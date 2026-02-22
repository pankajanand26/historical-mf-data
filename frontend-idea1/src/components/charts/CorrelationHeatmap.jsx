/**
 * CorrelationHeatmap
 * Custom CSS/div heatmap with diverging red–white–blue colour scale,
 * plus rolling 12-month correlation line charts for key asset pairs.
 */
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// Map correlation value [-1, 1] → CSS colour using a diverging scale
function corrToColor(v) {
  if (v == null) return '#F9FAFB';
  // clamp
  const c = Math.max(-1, Math.min(1, v));
  if (c >= 0) {
    // white → blue
    const t = c;
    const r = Math.round(255 * (1 - t * 0.75));
    const g = Math.round(255 * (1 - t * 0.55));
    const b = 255;
    return `rgb(${r},${g},${b})`;
  } else {
    // white → red
    const t = -c;
    const r = 255;
    const g = Math.round(255 * (1 - t * 0.55));
    const bl = Math.round(255 * (1 - t * 0.75));
    return `rgb(${r},${g},${bl})`;
  }
}

const PAIR_COLORS = ['#3B82F6', '#F59E0B', '#6366F1', '#10B981', '#EC4899'];

export default function CorrelationHeatmap({ data }) {
  if (!data?.labels?.length) return null;

  const { labels, asset_labels, matrix, rolling, rolling_labels } = data;
  const n = labels.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Correlation Analysis</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Pearson correlation of monthly returns · full sample period
        </p>
      </div>

      {/* ── Heatmap grid ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse mx-auto">
          <thead>
            <tr>
              <th className="w-24" />
              {labels.map((l) => (
                <th
                  key={l}
                  className="px-1 py-1 text-center font-medium text-gray-500 whitespace-nowrap"
                  style={{ minWidth: 64 }}
                >
                  {asset_labels[l]?.split(' ').slice(-1)[0] ?? l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={labels[i]}>
                <td className="pr-3 py-1 font-medium text-gray-600 text-right whitespace-nowrap">
                  {asset_labels[labels[i]]?.split('(')[0].trim() ?? labels[i]}
                </td>
                {row.map((val, j) => (
                  <td
                    key={labels[j]}
                    title={`${labels[i]} × ${labels[j]}: ${val}`}
                    className="text-center py-1 px-1 rounded-sm font-medium"
                    style={{
                      backgroundColor: corrToColor(val),
                      color: Math.abs(val) > 0.55 ? '#fff' : '#374151',
                      minWidth: 64,
                      height: 36,
                    }}
                  >
                    {i === j ? '—' : val.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 justify-center text-xs text-gray-500">
        <span>−1.0</span>
        <div
          className="h-3 rounded"
          style={{
            width: 200,
            background:
              'linear-gradient(to right, rgb(255,140,140), white, rgb(80,145,255))',
          }}
        />
        <span>+1.0</span>
      </div>

      {/* ── Rolling correlations ──────────────────────────────────────── */}
      {rolling && Object.keys(rolling).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Rolling 12-Month Correlations
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(rolling).map(([pairKey, pts], idx) => {
              const color = PAIR_COLORS[idx % PAIR_COLORS.length];
              const label = rolling_labels?.[pairKey] ?? pairKey;
              return (
                <div key={pairKey} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={pts} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: '#9CA3AF' }}
                        tickFormatter={(d) => d.slice(0, 4)}
                        interval={23}
                      />
                      <YAxis
                        domain={[-1, 1]}
                        tick={{ fontSize: 9, fill: '#9CA3AF' }}
                        tickFormatter={(v) => v.toFixed(1)}
                      />
                      <ReferenceLine y={0} stroke="#D1D5DB" strokeDasharray="3 3" />
                      <Tooltip
                        formatter={(v) => [v.toFixed(3), 'Correlation']}
                        labelFormatter={(d) => d}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
