import { useMemo } from 'react';
import { FUND_COLORS } from '../../../utils/constants';
import { shortName, fmt2 } from '../../../utils/formatters';
import { computeAllStats, computeFreefincalCaptureStats } from '../../../utils/statsUtils';
import { buildChartData, rfPeriodPct } from '../../../utils/chartUtils';

// ── Medal helpers ─────────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Given an array of numeric values (one per fund, can include NaN),
 * return rank indices where rank 0 = best.
 * `higherIsBetter` controls sort direction.
 */
function rankValues(values, higherIsBetter = true) {
  const indexed = values.map((v, i) => ({ v, i })).filter((x) => !isNaN(x.v) && x.v != null);
  indexed.sort((a, b) => (higherIsBetter ? b.v - a.v : a.v - b.v));
  const rankMap = {};
  indexed.forEach(({ i }, rank) => { rankMap[i] = rank; });
  return values.map((_, i) => (rankMap[i] != null ? rankMap[i] : null));
}

const RankBadge = ({ rank }) => {
  if (rank == null) return <span className="text-gray-300">—</span>;
  if (rank < 3) return <span title={`Rank #${rank + 1}`}>{MEDALS[rank]}</span>;
  return (
    <span className="inline-block w-5 h-5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 flex items-center justify-center">
      {rank + 1}
    </span>
  );
};

const signCls = (v, higherIsBetter = true) => {
  if (v == null || isNaN(v)) return 'text-gray-400';
  const good = higherIsBetter ? v > 0 : v < 0;
  return good ? 'text-green-600' : 'text-red-500';
};

// ── Card ──────────────────────────────────────────────────────────────────────

/**
 * Risk-Adjusted Ranking Card (Feature 18)
 *
 * Displays Sharpe, Sortino, Alpha, Info Ratio, Beta, Capture Ratio,
 * and Max Drawdown for every selected fund, with rank badges per metric.
 * All data comes from computeAllStats() — no new backend calls needed.
 */
const RankingCard = ({ data, analyticsData, rfRate, activeWindow }) => {
  const avail = useMemo(
    () => data?.benchmark_windows?.map((bw) => bw.window) ?? [],
    [data]
  );
  const curWin = avail.includes(activeWindow) ? activeWindow : avail[0] ?? '3y';
  const benchWin = data?.benchmark_windows?.find((bw) => bw.window === curWin);
  const rfPct = rfPeriodPct(rfRate, benchWin?.window_days ?? 365, 'absolute');

  const chartData = useMemo(
    () => buildChartData(data?.funds ?? [], benchWin, 'absolute'),
    [data, benchWin]
  );

  const allStats = useMemo(
    () => computeAllStats(data?.funds ?? [], chartData, rfPct, data?.monthly_returns),
    [data, chartData, rfPct]
  );

  const funds = data?.funds ?? [];

  // Extract per-fund metric values
  const metrics = useMemo(() => {
    return allStats.map((s) => {
      const fc = s.freefincal;
      const dd = analyticsData?.funds?.find(
        (f) => f.scheme_code === s.fund.scheme_code
      );
      return {
        scheme_code: s.fund.scheme_code,
        scheme_name: s.fund.scheme_name,
        color: s.color,
        ter: s.fund.ter,

        // Risk-adjusted
        sharpe: s.vol.sharpeFund,
        sortino: s.vol.sortinoFund,
        avgAlpha: s.outperf.avgAlpha,
        infoRatio: s.vol.infoRatio,
        beta: s.vol.beta,

        // Capture (Freefincal)
        captureRatio: fc?.captureRatio ?? NaN,
        ucr: fc?.ucr ?? NaN,
        dcr: fc?.dcr ?? NaN,

        // Outperformance
        outperformedPct: s.outperf.outperformedPct,

        // Drawdown
        maxDrawdown: dd?.drawdown?.max_drawdown ?? NaN,
      };
    });
  }, [allStats, analyticsData]);

  if (!funds.length || !metrics.length) return null;

  // Rank each metric (returns array of rank indices, one per fund)
  const rankSharpe     = rankValues(metrics.map((m) => m.sharpe),        true);
  const rankSortino    = rankValues(metrics.map((m) => m.sortino),       true);
  const rankAlpha      = rankValues(metrics.map((m) => m.avgAlpha),      true);
  const rankInfoRatio  = rankValues(metrics.map((m) => m.infoRatio),     true);
  const rankBeta       = rankValues(metrics.map((m) => m.beta),          false); // lower beta = safer rank
  const rankCapture    = rankValues(metrics.map((m) => m.captureRatio),  true);
  const rankOutperf    = rankValues(metrics.map((m) => m.outperformedPct), true);
  const rankDD         = rankValues(metrics.map((m) => m.maxDrawdown),   true);  // less negative = better

  // Composite score: average rank across all metrics (lower = better)
  const compositeRanks = metrics.map((_, i) => {
    const ranks = [
      rankSharpe[i], rankSortino[i], rankAlpha[i], rankInfoRatio[i],
      rankCapture[i], rankOutperf[i], rankDD[i],
    ].filter((r) => r != null);
    return ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;
  });
  const rankComposite = rankValues(compositeRanks.map((v) => (v != null ? -v : NaN)), true); // negate: lower rank sum = better

  const colHdr = 'text-[11px] text-gray-500 font-medium uppercase tracking-wide text-right py-2 px-2 border-b border-gray-200';
  const cell = 'py-2 px-2 text-right text-xs tabular-nums border-b border-gray-100';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Risk-Adjusted Ranking
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({curWin.toUpperCase()} window · absolute returns)
          </span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Medals show best (#1), second (#2), third (#3) per metric.
          Composite rank averages across all metrics.
        </p>
      </div>

      {/* Main ranking table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr>
              <th className={`${colHdr} text-left`}>Fund</th>
              <th className={colHdr} title="Sharpe Ratio = (mean - Rf) / σ">Sharpe</th>
              <th className={colHdr} title="Sortino Ratio = (mean - Rf) / downside σ">Sortino</th>
              <th className={colHdr} title="Average rolling alpha vs benchmark">Avg α</th>
              <th className={colHdr} title="Information Ratio = avg(alpha) / tracking error">Info Ratio</th>
              <th className={colHdr} title="Beta vs benchmark">Beta</th>
              <th className={colHdr} title="Freefincal Capture Ratio = UCR / DCR (monthly CAGR)">Capture</th>
              <th className={colHdr} title="% of rolling periods where fund outperformed">Hit %</th>
              {analyticsData && <th className={colHdr} title="Max Drawdown from peak">Max DD</th>}
              {funds.some((f) => f.ter != null) && <th className={colHdr} title="Applicable TER %">TER</th>}
              <th className={colHdr} title="Composite rank across all metrics">Overall</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr key={m.scheme_code} className="hover:bg-gray-50">
                {/* Fund name */}
                <td className={`${cell} text-left font-medium`} style={{ color: m.color }}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="truncate max-w-[180px]">{shortName(m.scheme_name)}</span>
                  </div>
                </td>

                {/* Sharpe */}
                <td className={`${cell} ${signCls(m.sharpe)}`}>
                  <span className="mr-1"><RankBadge rank={rankSharpe[i]} /></span>
                  {isNaN(m.sharpe) ? '—' : m.sharpe.toFixed(2)}
                </td>

                {/* Sortino */}
                <td className={`${cell} ${signCls(m.sortino)}`}>
                  <span className="mr-1"><RankBadge rank={rankSortino[i]} /></span>
                  {isNaN(m.sortino) ? '—' : m.sortino.toFixed(2)}
                </td>

                {/* Avg Alpha */}
                <td className={`${cell} ${signCls(m.avgAlpha)}`}>
                  <span className="mr-1"><RankBadge rank={rankAlpha[i]} /></span>
                  {isNaN(m.avgAlpha) ? '—' : `${m.avgAlpha.toFixed(2)}%`}
                </td>

                {/* Info Ratio */}
                <td className={`${cell} ${signCls(m.infoRatio)}`}>
                  <span className="mr-1"><RankBadge rank={rankInfoRatio[i]} /></span>
                  {isNaN(m.infoRatio) ? '—' : m.infoRatio.toFixed(2)}
                </td>

                {/* Beta */}
                <td className={`${cell} text-gray-700`}>
                  <span className="mr-1"><RankBadge rank={rankBeta[i]} /></span>
                  {isNaN(m.beta) ? '—' : m.beta.toFixed(2)}
                </td>

                {/* Capture Ratio */}
                <td className={`${cell} ${signCls(m.captureRatio - 1)}`}>
                  <span className="mr-1"><RankBadge rank={rankCapture[i]} /></span>
                  {isNaN(m.captureRatio) ? '—' : `${m.captureRatio.toFixed(1)}x`}
                </td>

                {/* Hit % */}
                <td className={`${cell} ${signCls(m.outperformedPct - 50)}`}>
                  <span className="mr-1"><RankBadge rank={rankOutperf[i]} /></span>
                  {`${m.outperformedPct.toFixed(0)}%`}
                </td>

                {/* Max Drawdown (conditional) */}
                {analyticsData && (
                  <td className={`${cell} text-red-500`}>
                    <span className="mr-1"><RankBadge rank={rankDD[i]} /></span>
                    {isNaN(m.maxDrawdown) ? '—' : `${m.maxDrawdown.toFixed(1)}%`}
                  </td>
                )}

                {/* TER (conditional) */}
                {funds.some((f) => f.ter != null) && (
                  <td className="py-2 px-2 text-right text-xs tabular-nums border-b border-gray-100 text-gray-600">
                    {m.ter != null ? fmt2(m.ter) : '—'}
                  </td>
                )}

                {/* Composite rank */}
                <td className={`${cell} font-semibold`}>
                  <RankBadge rank={rankComposite[i]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* UCR / DCR detail */}
      <div className="space-y-2">
        <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">
          Freefincal Capture Detail (monthly CAGR method)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map((m, i) => {
            const ucr = isNaN(m.ucr) ? null : m.ucr;
            const dcr = isNaN(m.dcr) ? null : m.dcr;
            return (
              <div
                key={m.scheme_code}
                className="rounded-lg border border-gray-200 p-3 space-y-1"
              >
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: m.color }}
                >
                  {shortName(m.scheme_name)}
                </p>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>UCR</span>
                  <span className={ucr != null ? (ucr >= 100 ? 'text-green-600 font-mono' : 'text-red-500 font-mono') : 'text-gray-400'}>
                    {ucr != null ? `${ucr.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>DCR</span>
                  <span className={dcr != null ? (dcr <= 100 ? 'text-green-600 font-mono' : 'text-red-500 font-mono') : 'text-gray-400'}>
                    {dcr != null ? `${dcr.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 border-t border-gray-100 pt-1">
                  <span>Capture</span>
                  <span className={m.captureRatio != null && !isNaN(m.captureRatio) ? (m.captureRatio >= 1 ? 'text-green-600 font-mono font-semibold' : 'text-red-500 font-mono font-semibold') : 'text-gray-400'}>
                    {isNaN(m.captureRatio) ? '—' : `${m.captureRatio.toFixed(2)}x`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RankingCard;
