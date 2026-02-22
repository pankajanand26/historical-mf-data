/**
 * WeightsBarChart
 * Grouped bar chart comparing asset weights across Max Sharpe, Min Variance
 * and Equal Weight portfolios.
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

const PORT_COLORS = {
  max_sharpe:   '#3B82F6',
  min_variance: '#10B981',
  equal_weight: '#F59E0B',
};

const PORT_LABELS = {
  max_sharpe:   'Max Sharpe',
  min_variance: 'Min Variance',
  equal_weight: 'Equal Weight',
};

export default function WeightsBarChart({ data }) {
  if (!data?.assets?.length) return null;

  const { assets, max_sharpe, min_variance, equal_weight } = data;

  // Build [{id, label, max_sharpe, min_variance, equal_weight}, ...]
  const chartData = assets.map((a) => ({
    id:          a.id,
    label:       a.label.split('(')[0].trim(),
    max_sharpe:  +(max_sharpe.weights[a.id] * 100).toFixed(1),
    min_variance:+(min_variance.weights[a.id] * 100).toFixed(1),
    equal_weight:+(equal_weight.weights[a.id] * 100).toFixed(1),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span style={{ color: entry.fill }}>■</span>
            <span className="text-gray-600">{PORT_LABELS[entry.dataKey]}:</span>
            <span className="font-medium">{entry.value?.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Portfolio Weights</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Asset allocation for each optimised portfolio
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 32, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            interval={0}
            angle={-20}
            textAnchor="end"
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(key) => PORT_LABELS[key]}
          />
          {Object.entries(PORT_COLORS).map(([key, color]) => (
            <Bar key={key} dataKey={key} fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-3 font-medium text-gray-500">Portfolio</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500">Return</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500">Volatility</th>
              <th className="text-right py-2 pl-2 font-medium text-gray-500">Sharpe</th>
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'max_sharpe',   p: data.max_sharpe   },
              { key: 'min_variance', p: data.min_variance },
              { key: 'equal_weight', p: data.equal_weight },
            ].map(({ key, p }) => (
              <tr key={key} className="border-b border-gray-100">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-sm"
                      style={{ backgroundColor: PORT_COLORS[key] }}
                    />
                    <span className="font-medium text-gray-700">{PORT_LABELS[key]}</span>
                  </div>
                </td>
                <td className="text-right py-2 px-2 text-gray-700">{p.ret.toFixed(2)}%</td>
                <td className="text-right py-2 px-2 text-gray-700">{p.vol.toFixed(2)}%</td>
                <td className="text-right py-2 pl-2 font-semibold text-gray-900">{p.sharpe.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
