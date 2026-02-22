/**
 * NavGrowthChart
 * Renders 6 normalised NAV lines (base 100) on a Recharts LineChart plus
 * a summary stats grid below.
 */
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

const ASSET_COLORS = {
  equity:    '#3B82F6',   // blue-500
  gold:      '#F59E0B',   // amber-500
  gilt:      '#10B981',   // emerald-500
  corp_bond: '#6366F1',   // indigo-500
  short_dur: '#EC4899',   // pink-500
  liquid:    '#8B5CF6',   // violet-500
};

/**
 * Merge all asset nav_series arrays into a single array of
 * { date, equity, gold, gilt, ... } objects that Recharts expects.
 */
function buildChartData(assets) {
  const map = {};
  for (const asset of assets) {
    for (const pt of asset.nav_series) {
      if (!map[pt.date]) map[pt.date] = { date: pt.date };
      map[pt.date][asset.id] = pt.value;
    }
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function fmt(n, dec = 1) {
  return n == null ? '—' : `${n.toFixed(dec)}%`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span style={{ color: entry.color }}>●</span>
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium">{entry.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
};

export default function NavGrowthChart({ data }) {
  if (!data?.assets?.length) return null;

  const chartData = buildChartData(data.assets);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Asset Class Growth</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Indexed to 100 · {data.common_start} – {data.common_end} · {data.months} months
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={(d) => d.slice(0, 7)}
            interval={23}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={(v) => `${v.toFixed(0)}`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) =>
              data.assets.find((a) => a.id === value)?.label ?? value
            }
          />
          {data.assets.map((asset) => (
            <Line
              key={asset.id}
              type="monotone"
              dataKey={asset.id}
              name={asset.id}
              stroke={ASSET_COLORS[asset.id] ?? '#6B7280'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Stats grid */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.assets.map((asset) => (
          <div
            key={asset.id}
            className="bg-gray-50 rounded-lg p-3 border border-gray-100"
          >
            <div
              className="w-2 h-2 rounded-full mb-1.5"
              style={{ backgroundColor: ASSET_COLORS[asset.id] ?? '#6B7280' }}
            />
            <p className="text-xs font-semibold text-gray-700 leading-tight mb-2">
              {asset.label}
            </p>
            <div className="space-y-0.5">
              <p className="text-xs text-gray-500">
                Total: <span className="font-medium text-gray-800">{fmt(asset.stats.total_return_pct)}</span>
              </p>
              <p className="text-xs text-gray-500">
                Ann: <span className="font-medium text-gray-800">{fmt(asset.stats.annualized_return_pct)}</span>
              </p>
              <p className="text-xs text-gray-500">
                Vol: <span className="font-medium text-gray-800">{fmt(asset.stats.volatility_ann_pct)}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
