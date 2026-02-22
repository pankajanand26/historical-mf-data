/**
 * MonteCarloChart
 * Block-bootstrap wealth path simulation for a single portfolio.
 * Renders percentile bands (p5–p95, p25–p75) + median line using
 * a stacked-area approach in Recharts ComposedChart.
 */
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label,
} from 'recharts';

const PORT_CONFIG = {
  max_sharpe:   { label: 'Max Sharpe',   color: '#3B82F6' },
  min_variance: { label: 'Min Variance', color: '#10B981' },
  equal_weight: { label: 'Equal Weight', color: '#F59E0B' },
};

/**
 * Transform raw [{month, p5, p25, p50, p75, p95}] into stacked-area format:
 *   base     = p5             (transparent, lifts the stack)
 *   band_lo  = p25 - p5       (p5–p25 band, light)
 *   band_mid = p75 - p25      (p25–p75 band, medium)
 *   band_hi  = p95 - p75      (p75–p95 band, light)
 *   median   = p50            (separate line)
 */
function transformMC(mc) {
  return mc.map((pt) => ({
    month:    pt.month,
    base:     pt.p5,
    band_lo:  +(pt.p25 - pt.p5).toFixed(4),
    band_mid: +(pt.p75 - pt.p25).toFixed(4),
    band_hi:  +(pt.p95 - pt.p75).toFixed(4),
    median:   pt.p50,
    p5:       pt.p5,
    p95:      pt.p95,
  }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload.find((p) => p.dataKey === 'median')?.payload;
  if (!d) return null;
  const yr = (label / 12).toFixed(1);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">Year {yr} (Month {label})</p>
      <p className="text-gray-600">Median: <span className="font-medium">{(d.median).toFixed(2)}×</span></p>
      <p className="text-gray-600">75th pct: <span className="font-medium">{(d.base + d.band_lo + d.band_mid).toFixed(2)}×</span></p>
      <p className="text-gray-600">25th pct: <span className="font-medium">{(d.base + d.band_lo).toFixed(2)}×</span></p>
      <p className="text-gray-600">95th pct: <span className="font-medium">{d.p95?.toFixed(2)}×</span></p>
      <p className="text-gray-600">5th pct: <span className="font-medium">{d.p5?.toFixed(2)}×</span></p>
    </div>
  );
};

function SingleMCChart({ portfolioKey, portResult, color, label }) {
  if (!portResult?.monte_carlo?.length) return null;
  const chartData = transformMC(portResult.monte_carlo);
  const alphaLo   = '33';  // ~20% opacity hex
  const alphaMid  = '66';  // ~40% opacity hex

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
      <p className="text-sm font-semibold mb-3" style={{ color }}>
        {label}
        <span className="text-xs text-gray-500 font-normal ml-2">
          Ann. ret {portResult.ret.toFixed(1)}% · vol {portResult.vol.toFixed(1)}% · Sharpe {portResult.sharpe.toFixed(2)}
        </span>
      </p>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={(m) => `Yr ${(m / 12).toFixed(0)}`}
            interval={11}
          >
            <Label value="Year" offset={-8} position="insideBottom" style={{ fontSize: 10, fill: '#9CA3AF' }} />
          </XAxis>
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={(v) => `${v.toFixed(1)}×`}
            domain={['auto', 'auto']}
          />
          <ReferenceLine y={1} stroke="#9CA3AF" strokeDasharray="4 4" />
          <Tooltip content={<CustomTooltip />} />

          {/* Stacked areas */}
          <Area
            type="monotone"
            dataKey="base"
            stackId="mc"
            fill="transparent"
            stroke="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="band_lo"
            stackId="mc"
            fill={`${color}${alphaLo}`}
            stroke="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="band_mid"
            stackId="mc"
            fill={`${color}${alphaMid}`}
            stroke="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="band_hi"
            stackId="mc"
            fill={`${color}${alphaLo}`}
            stroke="none"
            isAnimationActive={false}
          />
          {/* Median line */}
          <Line
            type="monotone"
            dataKey="median"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
        <span>
          <span
            className="inline-block w-3 h-2 rounded-sm mr-1"
            style={{ backgroundColor: `${color}${alphaMid}` }}
          />
          25th–75th pct
        </span>
        <span>
          <span
            className="inline-block w-3 h-2 rounded-sm mr-1"
            style={{ backgroundColor: `${color}${alphaLo}` }}
          />
          5th–95th pct
        </span>
        <span>
          <span
            className="inline-block w-3 h-0.5 mr-1 align-middle"
            style={{ backgroundColor: color, display: 'inline-block' }}
          />
          Median (p50)
        </span>
      </div>
    </div>
  );
}

export default function MonteCarloChart({ data }) {
  if (!data) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          Monte Carlo Wealth Paths
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          5,000 paths · 10-year horizon · block bootstrap from {data.months}-month history
          · ₹1 invested
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Object.entries(PORT_CONFIG).map(([key, { label, color }]) => (
          <SingleMCChart
            key={key}
            portfolioKey={key}
            portResult={data[key]}
            color={color}
            label={label}
          />
        ))}
      </div>
    </div>
  );
}
