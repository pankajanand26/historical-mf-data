/**
 * EfficientFrontierChart
 * Recharts ScatterChart showing:
 *   - 500 random-weight portfolio dots (risk-return cloud)
 *   - Efficient frontier line
 *   - Max Sharpe, Min Variance, Equal Weight as named markers
 */
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Label, ReferenceLine,
} from 'recharts';

const NAMED_PORTFOLIOS = [
  { key: 'max_sharpe',   label: 'Max Sharpe',   color: '#3B82F6', shape: '◆' },
  { key: 'min_variance', label: 'Min Variance', color: '#10B981', shape: '▲' },
  { key: 'equal_weight', label: 'Equal Weight', color: '#F59E0B', shape: '●' },
];

const CustomDot = ({ cx, cy, fill, payload }) => {
  if (!payload?.__named) return <circle cx={cx} cy={cy} r={3} fill={fill} opacity={0.7} />;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={fill} stroke="#fff" strokeWidth={1.5} />
    </g>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      {d.__label && (
        <p className="font-semibold text-gray-800 mb-1">{d.__label}</p>
      )}
      <p className="text-gray-600">Return: <span className="font-medium">{d.ret?.toFixed(2)}%</span></p>
      <p className="text-gray-600">Volatility: <span className="font-medium">{d.vol?.toFixed(2)}%</span></p>
      <p className="text-gray-600">Sharpe: <span className="font-medium">{d.sharpe?.toFixed(3)}</span></p>
    </div>
  );
};

export default function EfficientFrontierChart({ data }) {
  if (!data) return null;

  const { mc_scatter, frontier, max_sharpe, min_variance, equal_weight, risk_free_rate } = data;

  // Build named portfolio scatter data
  const namedData = NAMED_PORTFOLIOS.map(({ key, label, color }) => {
    const p = data[key];
    return { ret: p.ret, vol: p.vol, sharpe: p.sharpe, __named: true, __label: label, __color: color };
  });

  // Build frontier line data (sorted by vol)
  const frontierSorted = [...(frontier ?? [])].sort((a, b) => a.vol - b.vol);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Efficient Frontier</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Annualised risk vs return · 500 random portfolios · Markowitz MVO
          · RF = {(risk_free_rate * 100).toFixed(1)}%
        </p>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            type="number"
            dataKey="vol"
            name="Volatility"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            domain={['auto', 'auto']}
          >
            <Label value="Annualised Volatility (%)" offset={-12} position="insideBottom" style={{ fontSize: 11, fill: '#6B7280' }} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="ret"
            name="Return"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            domain={['auto', 'auto']}
          >
            <Label value="Annualised Return (%)" angle={-90} position="insideLeft" style={{ fontSize: 11, fill: '#6B7280' }} offset={8} />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />

          {/* Random portfolio cloud */}
          <Scatter
            name="Random Portfolios"
            data={mc_scatter}
            fill="#D1D5DB"
            opacity={0.5}
            shape={<CustomDot />}
          />

          {/* Efficient frontier line */}
          <Scatter
            name="Efficient Frontier"
            data={frontierSorted}
            fill="#1D4ED8"
            opacity={0.9}
            line={{ stroke: '#1D4ED8', strokeWidth: 2 }}
            lineType="joint"
            shape={() => null}
          />

          {/* Named portfolios */}
          {NAMED_PORTFOLIOS.map(({ key, label, color }) => (
            <Scatter
              key={key}
              name={label}
              data={[{ ...data[key], __named: true, __label: label }]}
              fill={color}
              shape={<CustomDot />}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 justify-center">
        {NAMED_PORTFOLIOS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span style={{ color }} className="text-base leading-none">◆</span>
            <span>{label}</span>
            <span className="text-gray-400">
              ({data[key].ret.toFixed(1)}% / {data[key].vol.toFixed(1)}% vol)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
