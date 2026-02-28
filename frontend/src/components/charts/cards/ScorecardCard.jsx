import { useMemo } from 'react';
import { computeFundScores, scoreGrade, scoreColor } from '../../../utils/scoreUtils';
import { computeAllStats } from '../../../utils/statsUtils';
import { buildChartData, rfPeriodPct } from '../../../utils/chartUtils';
import { shortName } from '../../../utils/formatters';

/**
 * Scorecard card - Multi-dimensional fund scoring system.
 * Shows normalized 0-100 scores across 5 dimensions with letter grades.
 * Uses global activeWindow from App.
 */
const ScorecardCard = ({ data, analyticsData, rfRate, activeWindow }) => {
  const avail = useMemo(
    () => data?.benchmark_windows?.map((bw) => bw.window) ?? [],
    [data]
  );
  // Use global activeWindow, fallback to first available
  const curWin = avail.includes(activeWindow) ? activeWindow : avail[0] ?? '3y';
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');
  const chartData = useMemo(
    () => buildChartData(data?.funds ?? [], benchWin, 'absolute'),
    [data, benchWin]
  );
  const allStats = useMemo(
    () => computeAllStats(data?.funds ?? [], chartData, rfPct),
    [data, chartData, rfPct]
  );
  const fundScores = useMemo(
    () => computeFundScores(allStats, analyticsData),
    [allStats, analyticsData]
  );

  const dims = ['returns', 'risk', 'consistency', 'capture', 'drawdown'];
  const dimLabels = {
    returns: 'Returns',
    risk: 'Risk',
    consistency: 'Consistency',
    capture: 'Capture',
    drawdown: 'Drawdown',
  };

  if (!data?.funds?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Fund Scorecard
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({curWin.toUpperCase()} window)
          </span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Multi-dimensional fund comparison · 0-100 scale · Min-max normalized within selection
        </p>
      </div>

      {/* Scoring methodology */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-700">Scoring Dimensions:</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <li><span className="font-medium">Returns:</span> Average alpha vs benchmark</li>
          <li><span className="font-medium">Risk:</span> Sharpe ratio (risk-adjusted return)</li>
          <li><span className="font-medium">Consistency:</span> % of periods outperforming</li>
          <li><span className="font-medium">Capture:</span> Up/Down capture ratio</li>
          <li><span className="font-medium">Drawdown:</span> Max drawdown (less negative = better)</li>
        </ul>
      </div>

      {/* Scorecard table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
              {dims.map((d) => (
                <th key={d} className="text-center font-medium text-gray-500 pb-2 px-2">
                  {dimLabels[d]}
                </th>
              ))}
              <th className="text-center font-medium text-gray-500 pb-2 px-2">Overall</th>
              <th className="text-center font-medium text-gray-500 pb-2 pl-2">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fundScores.map(({ fund, color, scores, overall }) => {
              const { grade, color: gradeColor } = scoreGrade(overall);
              return (
                <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
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
                  {dims.map((d) => (
                    <td key={d} className="py-3 px-2 text-center">
                      <span
                        className="inline-block px-2.5 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: scoreColor(scores[d]),
                          color: scores[d] != null ? '#374151' : '#9ca3af',
                        }}
                      >
                        {scores[d] != null ? scores[d].toFixed(0) : '—'}
                      </span>
                    </td>
                  ))}
                  <td className="py-3 px-2 text-center">
                    <span className="font-bold text-blue-600 text-base">
                      {overall != null ? overall.toFixed(0) : '—'}
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-center">
                    <span
                      className="font-bold text-lg"
                      style={{ color: gradeColor }}
                    >
                      {grade}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Grade legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span className="font-medium">Grade Scale:</span>
        <span><span className="font-bold text-emerald-500">A+</span> (85+)</span>
        <span><span className="font-bold text-green-400">A</span> (70-84)</span>
        <span><span className="font-bold text-yellow-500">B</span> (55-69)</span>
        <span><span className="font-bold text-orange-500">C</span> (40-54)</span>
        <span><span className="font-bold text-red-500">D</span> (&lt;40)</span>
      </div>
    </div>
  );
};

export default ScorecardCard;
