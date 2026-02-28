import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BENCHMARK_COLOR } from '../../../utils/constants';
import { shortName, fmtRatio } from '../../../utils/formatters';
import { SectionHeader, SignedValue, NeutralValue } from '../../ui';
import { ScatterTooltip } from '../tooltips';

const PerformanceRiskCard = ({
  data,
  currentWindow,
  returnType,
  riskFreeAnnual,
  allStats,
  scatterFundPoints,
  benchPoint,
}) => {
  const returnLabel = returnType === 'cagr' ? 'CAGR' : 'Absolute';

  // Get benchmark stats from first fund's vol stats (they all have same bench values)
  const benchStats = allStats.length > 0 ? allStats[0].vol : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-8">
      {/* Card header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">Performance &amp; Risk Analysis</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {currentWindow.toUpperCase()} rolling {returnLabel} returns ·{' '}
          {allStats[0]?.outperf.total ?? 0} shared data points ·{' '}
          Rf = {(riskFreeAnnual * 100).toFixed(1)}% p.a. · Fund vs{' '}
          <span className="font-medium">{shortName(data.benchmark_name)}</span>
        </p>
      </div>

      {/* ── Section 1: Outperformance ─────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Outperformance vs Benchmark"
          subtitle="How often did the fund beat or trail the benchmark over this rolling window?"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">Outperformed</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">Underperformed</th>
                <th className="text-right font-medium text-gray-500 pb-2 pl-3">Avg Alpha / period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allStats.map(({ fund, color, outperf }) => (
                <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                        {shortName(fund.scheme_name)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className="font-semibold text-emerald-600">{outperf.outperformedPct.toFixed(1)}%</span>
                      <span className="text-xs text-gray-400">{outperf.outperformed}/{outperf.total} periods</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className="font-semibold text-rose-600">{outperf.underperformedPct.toFixed(1)}%</span>
                      <span className="text-xs text-gray-400">{outperf.underperformed}/{outperf.total} periods</span>
                    </div>
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <SignedValue value={outperf.avgAlpha} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Avg Alpha = mean(Fund − Benchmark) per period. Positive = fund consistently delivered more.
        </p>
      </div>

      {/* ── Section 2: Absolute vs Relative Volatility ────────────────── */}
      <div>
        <SectionHeader
          title="Absolute vs Relative Volatility"
          subtitle="How much does the fund's return vary on its own, and how does it move relative to the benchmark?"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">Std Dev</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">Beta (β)</th>
                <th className="text-right font-medium text-gray-500 pb-2 pl-3">Tracking Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Benchmark row */}
              {benchStats && (
                <tr className="bg-gray-50/70">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: BENCHMARK_COLOR }} />
                      <span className="font-medium text-gray-600 truncate" title={data.benchmark_name}>
                        {shortName(data.benchmark_name)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">(Benchmark)</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <NeutralValue value={benchStats.stdDevBench} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-gray-600 font-semibold">1.00</span>
                  </td>
                  <td className="py-3 pl-3 text-right text-gray-400">—</td>
                </tr>
              )}
              {allStats.map(({ fund, color, vol }) => (
                <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                        {shortName(fund.scheme_name)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <NeutralValue value={vol.stdDevFund} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    {/* Beta: colour-code >1 as amber (aggressive) <1 as blue (defensive) */}
                    {isNaN(vol.beta) ? (
                      <span className="text-gray-400">N/A</span>
                    ) : (
                      <span className={`font-semibold ${
                        vol.beta > 1.1 ? 'text-amber-600'
                        : vol.beta < 0.9 ? 'text-blue-600'
                        : 'text-gray-800'
                      }`}>
                        {vol.beta.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <NeutralValue value={vol.trackingError} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 mt-2 space-y-0.5">
          <p>Std Dev = standard deviation of rolling return observations (wider spread = more uncertain outcomes).</p>
          <p>Beta &gt; 1 = amplifies benchmark (amber), Beta &lt; 1 = dampens benchmark (blue), ~1 = market-like (gray).</p>
          <p>Tracking Error = σ(Fund − Benchmark). Low TE = benchmark-hugging. High TE = high-conviction active bet.</p>
          <p className="text-gray-300">Note: rolling return observations are overlapping — Std Dev / TE comparisons are valid for ranking, not for absolute volatility inference.</p>
        </div>
      </div>

      {/* ── Section 3: Fund Quality Indicators ───────────────────────── */}
      <div>
        <SectionHeader
          title="Fund Quality Indicators"
          subtitle="How consistent and efficient is the fund's active management relative to the benchmark?"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">Avg Alpha</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">Tracking Error</th>
                <th className="text-right font-medium text-gray-500 pb-2 pl-3">Information Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allStats.map(({ fund, color, outperf, vol }) => (
                <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                        {shortName(fund.scheme_name)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <SignedValue value={outperf.avgAlpha} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <NeutralValue value={vol.trackingError} />
                  </td>
                  <td className="py-3 pl-3 text-right">
                    {/* IR interpretation: >0.5 = good, >1.0 = excellent */}
                    {isNaN(vol.infoRatio) ? (
                      <span className="text-gray-400">N/A</span>
                    ) : (
                      <span className={`font-semibold ${
                        vol.infoRatio >= 1.0 ? 'text-emerald-600'
                        : vol.infoRatio >= 0.5 ? 'text-blue-600'
                        : vol.infoRatio >= 0 ? 'text-gray-700'
                        : 'text-rose-600'
                      }`}>
                        {fmtRatio(vol.infoRatio)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 mt-2 space-y-0.5">
          <p>Information Ratio = Avg Alpha / Tracking Error. Measures alpha earned per unit of active risk taken.</p>
          <p>
            <span className="text-emerald-600 font-medium">IR &ge; 1.0</span> = excellent ·{' '}
            <span className="text-blue-600 font-medium">0.5 – 1.0</span> = good ·{' '}
            <span className="text-gray-700 font-medium">0 – 0.5</span> = weak positive ·{' '}
            <span className="text-rose-600 font-medium">&lt; 0</span> = underperforming on a risk-adjusted basis
          </p>
        </div>
      </div>

      {/* ── Section 4: Symmetric vs Asymmetric Risk ───────────────────── */}
      <div>
        <SectionHeader
          title="Symmetric vs Asymmetric Risk"
          subtitle={`Risk-adjusted return using total volatility (Sharpe) and downside-only volatility (Sortino) · Rf = ${(riskFreeAnnual * 100).toFixed(1)}% p.a.`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">Sharpe</th>
                <th className="text-right font-medium text-gray-500 pb-2 pl-3">Sortino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Benchmark row */}
              {benchStats && (
                <tr className="bg-gray-50/70">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: BENCHMARK_COLOR }} />
                      <span className="font-medium text-gray-600 truncate" title={data.benchmark_name}>
                        {shortName(data.benchmark_name)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">(Benchmark)</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <SignedValue value={benchStats.sharpeBench} isRatio />
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <SignedValue value={benchStats.sortinoBench} isRatio />
                  </td>
                </tr>
              )}
              {allStats.map(({ fund, color, vol }) => (
                <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                        {shortName(fund.scheme_name)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <SignedValue value={vol.sharpeFund} isRatio />
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <SignedValue value={vol.sortinoFund} isRatio />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 mt-2 space-y-0.5">
          <p>Sharpe = (Mean Return − Rf) / Std Dev. Penalises all volatility equally — symmetric.</p>
          <p>Sortino = (Mean Return − Rf) / Downside Std Dev. Only penalises returns below Rf — asymmetric, investor-friendly.</p>
          <p>Fund Sharpe &gt; Benchmark Sharpe = fund offered better risk-adjusted return. Same logic for Sortino.</p>
        </div>
      </div>

      {/* ── Section 5: Risk-Return Scatter ───────────────────────────── */}
      {scatterFundPoints.length > 0 && benchPoint && (
        <div>
          <SectionHeader
            title="Risk-Return Map"
            subtitle="Each dot = a fund or benchmark. Upper-left quadrant = higher return for less risk (better). Upper-right = higher return but higher risk."
          />
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number" dataKey="x" name="Std Dev"
                label={{ value: `Risk — Std Dev (${returnLabel} %)`, position: 'insideBottom', offset: -12, fontSize: 11, fill: '#9ca3af' }}
                tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                domain={['auto', 'auto']}
              />
              <YAxis
                type="number" dataKey="y" name="Mean Return"
                label={{ value: `Return — Mean (${returnLabel} %)`, angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#9ca3af' }}
                tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                domain={['auto', 'auto']}
              />
              <ZAxis range={[80, 80]} />
              <Tooltip content={<ScatterTooltip />} />

              {/* One Scatter per fund so each gets its own colour */}
              {scatterFundPoints.map((pt) => (
                <Scatter
                  key={pt.name}
                  name={pt.name}
                  data={[pt]}
                  fill={pt.color}
                />
              ))}

              {/* Benchmark as a distinct diamond shape */}
              <Scatter
                name={shortName(data.benchmark_name)}
                data={[benchPoint]}
                fill={BENCHMARK_COLOR}
                shape={(props) => {
                  const { cx, cy } = props;
                  const s = 8;
                  return (
                    <polygon
                      points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                      fill={BENCHMARK_COLOR}
                      opacity={0.9}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>

          {/* Legend for scatter */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {scatterFundPoints.map((pt) => (
              <div key={pt.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pt.color }} />
                {pt.name}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <polygon points="6,0 12,6 6,12 0,6" fill={BENCHMARK_COLOR} opacity="0.9" />
              </svg>
              {shortName(data.benchmark_name)}
            </div>
          </div>
        </div>
      )}

      {/* Footer disclaimer */}
      <p className="text-xs text-gray-300 border-t border-gray-50 pt-3">
        All metrics derived from {allStats[0]?.outperf.total ?? 0} co-aligned downsampled rolling-return
        observations. Overlapping windows introduce serial correlation — use for relative comparison only,
        not as standalone absolute risk estimates.
      </p>
    </div>
  );
};

export default PerformanceRiskCard;
