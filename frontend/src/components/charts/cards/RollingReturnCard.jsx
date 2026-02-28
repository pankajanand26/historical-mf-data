import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { FUND_COLORS, BENCHMARK_COLOR } from '../../../utils/constants';
import { shortName, tickFormatter } from '../../../utils/formatters';
import { LineTooltip } from '../tooltips';

const RollingReturnCard = ({
  data,
  funds,
  windows,
  currentWindow,
  returnType,
  setReturnType,
  chartData,
  hasData,
  fundStats,
  benchLatest,
  benchAvg,
}) => {
  // Find current window's data point count for display
  const windowInfo = windows.find((w) => w.window === currentWindow);
  const dataPoints = windowInfo?.data_points ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Rolling Returns vs Benchmark
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({currentWindow.toUpperCase()} · {dataPoints} data points)
          </span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {returnType === 'absolute'
            ? 'Total return over trailing window · Values in %'
            : 'Annualised (CAGR) return over trailing window · Values in %'}
        </p>
      </div>

      {/* Absolute/CAGR toggle only */}
      <div className="flex items-center justify-end gap-3 mb-5">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-sm font-medium shadow-sm">
          <button
            onClick={() => setReturnType('absolute')}
            className={`px-3 py-1.5 transition-colors ${
              returnType === 'absolute' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Absolute
          </button>
          <button
            onClick={() => setReturnType('cagr')}
            className={`px-3 py-1.5 transition-colors ${
              returnType === 'cagr' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            CAGR
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="space-y-2 mb-5">
        {fundStats.map(({ fund, color, latest, avg }) => (
          <div key={fund.scheme_code} className="grid grid-cols-3 gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
            <div className="col-span-1 flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs font-medium text-gray-700 truncate" title={fund.scheme_name}>
                {shortName(fund.scheme_name)}
              </span>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Latest</p>
              <p className="text-sm font-semibold" style={{ color }}>
                {latest != null ? `${latest.toFixed(2)}%` : 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Avg</p>
              <p className="text-sm font-semibold" style={{ color }}>
                {avg != null ? `${avg.toFixed(2)}%` : 'N/A'}
              </p>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-3 gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
          <div className="col-span-1 flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-full flex-shrink-0 border-2"
              style={{ borderColor: BENCHMARK_COLOR, backgroundColor: 'white' }} />
            <span className="text-xs font-medium text-gray-700 truncate" title={data.benchmark_name}>
              {shortName(data.benchmark_name)}
            </span>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Latest</p>
            <p className="text-sm font-semibold" style={{ color: BENCHMARK_COLOR }}>
              {benchLatest != null ? `${benchLatest.toFixed(2)}%` : 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Avg</p>
            <p className="text-sm font-semibold" style={{ color: BENCHMARK_COLOR }}>
              {benchAvg != null ? `${benchAvg.toFixed(2)}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Not enough data to compute {currentWindow.toUpperCase()} rolling returns
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tickFormatter={tickFormatter}
              tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`}
              tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <Tooltip content={<LineTooltip />} />
            <Legend formatter={(value) => <span className="text-xs text-gray-700">{value}</span>} />
            <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />

            {funds.map((fund, idx) => (
              <Line key={fund.scheme_code} type="monotone"
                dataKey={`fund_${fund.scheme_code}`} name={shortName(fund.scheme_name)}
                stroke={FUND_COLORS[idx % FUND_COLORS.length]}
                dot={false} strokeWidth={2} connectNulls={false} />
            ))}
            <Line type="monotone" dataKey="benchmark" name={shortName(data.benchmark_name)}
              stroke={BENCHMARK_COLOR} dot={false} strokeWidth={2}
              strokeDasharray="5 3" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default RollingReturnCard;
