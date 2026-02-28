import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  extractReturnDist,
  computeGoalProjections,
  goalProbability,
} from '../../../utils/sipUtils';
import { shortName, fmtLakh } from '../../../utils/formatters';
import { FUND_COLORS } from '../../../utils/constants';
import { SectionHeader } from '../../ui';

/**
 * SIP Planner card - Goal-based SIP projection with probability analysis.
 * Shows fan chart of potential outcomes and goal hit probability.
 * Uses global activeWindow from App.
 */
const SipPlannerCard = ({ data, activeWindow }) => {
  const [sipAmount, setSipAmount] = useState(10000);
  const [horizonYears, setHorizonYears] = useState(10);
  const [targetCorpus, setTargetCorpus] = useState(2500000);

  const avail = useMemo(
    () => data?.benchmark_windows?.map((bw) => bw.window) ?? [],
    [data]
  );
  // Use global activeWindow, fallback to first available
  const curWin = avail.includes(activeWindow) ? activeWindow : avail[0] ?? '3y';
  const funds = data?.funds ?? [];

  const projections = useMemo(() => {
    return funds.map((fund, i) => {
      const dist = extractReturnDist(data, fund.scheme_code, curWin);
      const proj = computeGoalProjections(dist, sipAmount, horizonYears);
      const prob = goalProbability(
        dist,
        sipAmount,
        horizonYears * 12,
        targetCorpus
      );
      return {
        fund,
        color: FUND_COLORS[i % FUND_COLORS.length],
        projection: proj,
        probability: prob,
        observations: dist.length,
      };
    });
  }, [data, funds, sipAmount, horizonYears, targetCorpus, curWin]);

  // Build fan chart data for first fund with projections
  const fanChartFund = projections.find((p) => p.projection.length > 0);
  const fanChartData = fanChartFund?.projection ?? [];

  if (!data?.funds?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          SIP Planner
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({curWin.toUpperCase()} window)
          </span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Goal-based SIP projection using historical return distribution ·
          Monte Carlo simulation
        </p>
      </div>

      {/* Controls - SIP inputs only (no window selector) */}
      <div className="flex flex-wrap items-center gap-4">
        {/* SIP Input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">SIP</span>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
              ₹
            </span>
            <input
              type="number"
              value={sipAmount}
              onChange={(e) =>
                setSipAmount(Math.max(500, parseInt(e.target.value) || 500))
              }
              className="w-28 pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Horizon Input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Years</span>
          <input
            type="number"
            value={horizonYears}
            onChange={(e) =>
              setHorizonYears(
                Math.max(1, Math.min(30, parseInt(e.target.value) || 1))
              )
            }
            className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
          />
        </div>

        {/* Target Input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Target</span>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
              ₹
            </span>
            <input
              type="number"
              value={targetCorpus}
              onChange={(e) =>
                setTargetCorpus(
                  Math.max(10000, parseInt(e.target.value) || 10000)
                )
              }
              className="w-32 pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Investing{' '}
          <span className="font-semibold text-blue-700">
            ₹{sipAmount.toLocaleString('en-IN')}
          </span>{' '}
          per month for{' '}
          <span className="font-semibold text-blue-700">{horizonYears}</span>{' '}
          years = Total invested:{' '}
          <span className="font-semibold text-blue-700">
            {fmtLakh(sipAmount * horizonYears * 12)}
          </span>
        </p>
      </div>

      {/* Fan Chart */}
      <div>
        <SectionHeader
          title="Projection Fan Chart"
          subtitle={`Based on ${fanChartFund?.observations ?? 0} historical ${curWin.toUpperCase()} return observations from ${fanChartFund ? shortName(fanChartFund.fund.scheme_name) : 'selected fund'}`}
        />
        {fanChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={fanChartData}
              margin={{ top: 10, right: 20, bottom: 10, left: 60 }}
            >
              <defs>
                <linearGradient id="fanGradLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                label={{
                  value: 'Years',
                  position: 'insideBottom',
                  offset: -5,
                  fontSize: 11,
                  fill: '#9ca3af',
                }}
              />
              <YAxis
                tickFormatter={(v) => fmtLakh(v)}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(v) => fmtLakh(v)}
              />
              <ReferenceLine
                y={targetCorpus}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="6 3"
                label={{
                  value: `Target: ${fmtLakh(targetCorpus)}`,
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'right',
                }}
              />
              <Area
                type="monotone"
                dataKey="p10"
                stroke="none"
                fill="#dcfce7"
                fillOpacity={0.8}
                name="P10 (Pessimistic)"
              />
              <Area
                type="monotone"
                dataKey="p25"
                stroke="none"
                fill="#bbf7d0"
                fillOpacity={0.8}
                name="P25"
              />
              <Area
                type="monotone"
                dataKey="p50"
                stroke="#22c55e"
                fill="url(#fanGradLight)"
                strokeWidth={2}
                name="P50 (Median)"
              />
              <Area
                type="monotone"
                dataKey="p75"
                stroke="none"
                fill="#bbf7d0"
                fillOpacity={0.8}
                name="P75"
              />
              <Area
                type="monotone"
                dataKey="p90"
                stroke="none"
                fill="#dcfce7"
                fillOpacity={0.8}
                name="P90 (Optimistic)"
              />
              <Line
                type="monotone"
                dataKey="invested"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="Total Invested"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">
              No projection data available.
            </p>
          </div>
        )}
      </div>

      {/* Goal Probability Table */}
      <div>
        <SectionHeader
          title="Goal Probability per Fund"
          subtitle={`Chance of reaching ₹${(targetCorpus / 100000).toFixed(1)}L target in ${horizonYears} years`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-medium text-gray-500 pb-2 pr-4">
                  Fund
                </th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">
                  P10 (Low)
                </th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">
                  P50 (Med)
                </th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">
                  P90 (High)
                </th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">
                  Hit Prob.
                </th>
                <th className="text-right font-medium text-gray-500 pb-2 pl-3">
                  Obs.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projections.map(
                ({ fund, color, projection, probability, observations }) => {
                  const final = projection[projection.length - 1];
                  return (
                    <tr
                      key={fund.scheme_code}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span
                            className="font-medium text-gray-800 truncate max-w-[200px]"
                            title={fund.scheme_name}
                          >
                            {shortName(fund.scheme_name)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {final ? fmtLakh(final.p10) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                        {final ? fmtLakh(final.p50) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {final ? fmtLakh(final.p90) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {probability != null ? (
                          <span
                            className={`font-semibold ${
                              probability >= 70
                                ? 'text-emerald-600'
                                : probability >= 50
                                  ? 'text-amber-600'
                                  : 'text-red-500'
                            }`}
                          >
                            {probability.toFixed(0)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right text-gray-400">
                        {observations}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-gray-400 border-t border-gray-100 pt-3 space-y-1">
        <p>
          <strong>Note:</strong> Projections are based on historical return
          distributions and assume past patterns continue. Actual returns may
          vary.
        </p>
        <p>
          P10/P50/P90 = 10th/50th/90th percentile outcomes. Hit Probability = %
          of historical scenarios that would have reached the target.
        </p>
      </div>
    </div>
  );
};

export default SipPlannerCard;
