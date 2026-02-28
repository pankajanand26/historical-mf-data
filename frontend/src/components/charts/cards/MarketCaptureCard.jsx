import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  AreaChart,
  Area,
} from 'recharts';
import { shortName, tickFormatter } from '../../../utils/formatters';
import { SectionHeader } from '../../ui';
import { CaptureScatterTooltip, AlphaTooltip } from '../tooltips';

const MarketCaptureCard = ({
  currentWindow,
  returnType,
  captureStats,
  scatterDomain,
}) => {
  const returnLabel = returnType === 'cagr' ? 'CAGR' : 'Absolute';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Market Capture Analysis</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          How does each fund capture gains and protect against losses relative to the benchmark?
        </p>
      </div>

      {/* ── Section 6a: Capture table ─────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Upside / Downside Capture"
          subtitle={`Based on ${currentWindow.toUpperCase()} rolling ${returnLabel.toLowerCase()} return observations · ${captureStats[0]?.capture.upPeriods ?? 0} up-market periods · ${captureStats[0]?.capture.downPeriods ?? 0} down-market periods`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">UCR</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">DCR</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">Capture Ratio</th>
                <th className="text-right font-medium text-gray-500 pb-2 px-3">Up Consistency</th>
                <th className="text-right font-medium text-gray-500 pb-2 pl-3">Down Consistency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {captureStats.map(({ fund, color, capture }) => (
                <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                        {shortName(fund.scheme_name)}
                      </span>
                    </div>
                  </td>
                  {/* UCR: >100 = outperformed in up market (emerald), <100 = amber */}
                  <td className="py-3 px-3 text-right">
                    {isNaN(capture.ucr) ? <span className="text-gray-400">N/A</span> : (
                      <span className={`font-semibold ${capture.ucr >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {capture.ucr.toFixed(1)}
                      </span>
                    )}
                  </td>
                  {/* DCR: <100 = protected in down market (emerald), >100 = amplified (rose) */}
                  <td className="py-3 px-3 text-right">
                    {isNaN(capture.dcr) ? <span className="text-gray-400">N/A</span> : (
                      <span className={`font-semibold ${capture.dcr <= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {capture.dcr.toFixed(1)}
                      </span>
                    )}
                  </td>
                  {/* Capture Ratio: >1 = more up than down capture (emerald), <1 = rose */}
                  <td className="py-3 px-3 text-right">
                    {isNaN(capture.captureRatio) ? <span className="text-gray-400">N/A</span> : (
                      <span className={`font-semibold ${capture.captureRatio >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {capture.captureRatio.toFixed(2)}x
                      </span>
                    )}
                  </td>
                  {/* Up Consistency: % of up-benchmark periods fund beat benchmark */}
                  <td className="py-3 px-3 text-right">
                    {isNaN(capture.upConsistPct) ? <span className="text-gray-400">N/A</span> : (
                      <span className={`font-semibold ${capture.upConsistPct >= 60 ? 'text-emerald-600' : capture.upConsistPct >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {capture.upConsistPct.toFixed(1)}%
                      </span>
                    )}
                  </td>
                  {/* Down Consistency: % of down-benchmark periods fund fell less */}
                  <td className="py-3 pl-3 text-right">
                    {isNaN(capture.downConsistPct) ? <span className="text-gray-400">N/A</span> : (
                      <span className={`font-semibold ${capture.downConsistPct >= 60 ? 'text-emerald-600' : capture.downConsistPct >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {capture.downConsistPct.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 mt-2 space-y-0.5">
          <p>
            <span className="font-medium">UCR</span> (Upside Capture Ratio) = mean fund return in rising-benchmark periods / mean benchmark return in those periods × 100.{' '}
            <span className="text-emerald-600 font-medium">&ge;100</span> = captured more of benchmark gains.
          </p>
          <p>
            <span className="font-medium">DCR</span> (Downside Capture Ratio) = same logic in falling-benchmark periods.{' '}
            <span className="text-emerald-600 font-medium">&le;100</span> = protected more in drawdowns.
          </p>
          <p>
            <span className="font-medium">Capture Ratio</span> = UCR / DCR.{' '}
            <span className="text-emerald-600 font-medium">&gt;1x</span> = captured more upside than downside (ideal).{' '}
            <span className="font-medium">Up/Down Consistency</span> = % of periods where fund outperformed benchmark in rising/falling markets respectively.
          </p>
          <p className="text-gray-300">
            Note: computed from overlapping rolling-return observations (not monthly NAV as per Morningstar convention). Best used for relative comparison across funds.
          </p>
        </div>

        {/* ── Period breakdown table ──────────────────────────────────── */}
        <div className="mt-6">
          <SectionHeader
            title="Observation Period Breakdown"
            subtitle="Number of rolling-return observations used in the capture analysis above"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Total Observations</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Up-Market Periods</th>
                  <th className="text-right font-medium text-gray-500 pb-2 pl-3">Down-Market Periods</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {captureStats.map(({ fund, color, capture }) => (
                  <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                          {shortName(fund.scheme_name)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-800">
                      {capture.totalPeriods}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-blue-600">
                      {capture.upPeriods}
                    </td>
                    <td className="py-3 pl-3 text-right font-semibold text-rose-600">
                      {capture.downPeriods}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Up-market periods: benchmark rolling return &gt; 0. Down-market periods: benchmark rolling return &lt; 0.
            Observations where benchmark = 0 exactly are excluded from both counts but included in the total.
          </p>
        </div>

        {/* ── Down Market Alpha table ─────────────────────────────────── */}
        <div className="mt-6">
          <SectionHeader
            title="Down Market Alpha"
            subtitle="Average excess return (fund − benchmark) across all down-market rolling-return observations"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                  <th className="text-right font-medium text-gray-500 pb-2 px-3">Down Market Alpha</th>
                  <th className="text-right font-medium text-gray-500 pb-2 pl-3">Down Periods Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {captureStats.map(({ fund, color, capture }) => (
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
                      {isNaN(capture.downAlpha) ? (
                        <span className="text-gray-400">N/A</span>
                      ) : (
                        <span className={`font-semibold ${capture.downAlpha >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {capture.downAlpha >= 0 ? '+' : ''}{capture.downAlpha.toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right font-semibold text-gray-600">
                      {capture.downPeriods > 0 ? capture.downPeriods : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Down Market Alpha = mean(fund return − benchmark return) in all down-benchmark rolling-return observations.{' '}
            <span className="text-emerald-600 font-medium">Positive</span> = fund lost less than the benchmark on average during downturns (downside protection).{' '}
            <span className="text-rose-600 font-medium">Negative</span> = fund amplified losses relative to the benchmark (typically driven by expense ratio drag for index funds).
          </p>
        </div>

        {/* ── Freefincal-style Capture Ratios (monthly CAGR method) ──── */}
        {captureStats.some((s) => s.freefincal !== null) && (
          <div className="mt-6">
            <SectionHeader
              title="Freefincal-style Capture Ratios"
              subtitle="Monthly CAGR method · non-overlapping month-end NAV returns · benchmark months where return = 0 excluded"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 pb-2 pr-4">Fund</th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">UCR</th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">DCR</th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">Capture Ratio</th>
                    <th className="text-right font-medium text-gray-500 pb-2 px-3">Up Months</th>
                    <th className="text-right font-medium text-gray-500 pb-2 pl-3">Down Months</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {captureStats.map(({ fund, color, freefincal }) => (
                    <tr key={fund.scheme_code} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-medium text-gray-800 truncate" title={fund.scheme_name}>
                            {shortName(fund.scheme_name)}
                          </span>
                        </div>
                      </td>
                      {/* UCR: >100 = captured more up (emerald), <100 = amber */}
                      <td className="py-3 px-3 text-right">
                        {!freefincal || isNaN(freefincal.ucr) ? (
                          <span className="text-gray-400">N/A</span>
                        ) : (
                          <span className={`font-semibold ${freefincal.ucr >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {freefincal.ucr.toFixed(1)}
                          </span>
                        )}
                      </td>
                      {/* DCR: <100 = protected in downturns (emerald), >100 = rose */}
                      <td className="py-3 px-3 text-right">
                        {!freefincal || isNaN(freefincal.dcr) ? (
                          <span className="text-gray-400">N/A</span>
                        ) : (
                          <span className={`font-semibold ${freefincal.dcr <= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {freefincal.dcr.toFixed(1)}
                          </span>
                        )}
                      </td>
                      {/* Capture Ratio: >1 = ideal (emerald), <1 = rose */}
                      <td className="py-3 px-3 text-right">
                        {!freefincal || isNaN(freefincal.captureRatio) ? (
                          <span className="text-gray-400">N/A</span>
                        ) : (
                          <span className={`font-semibold ${freefincal.captureRatio >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {freefincal.captureRatio.toFixed(2)}x
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-600">
                        {freefincal ? freefincal.upMonths : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 pl-3 text-right font-semibold text-rose-600">
                        {freefincal ? freefincal.downMonths : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-400 mt-2 space-y-0.5">
              <p>
                <span className="font-medium">Methodology:</span> Filter non-overlapping monthly returns to up-benchmark months (benchmark &gt; 0) and down-benchmark months (benchmark &lt; 0).
                Compute annualised CAGR from each filtered set using the product formula: CAGR = [∏(1+rᵢ)]^(12/n) − 1.
                UCR = upCAGR_fund / upCAGR_bench × 100. DCR = downCAGR_fund / downCAGR_bench × 100. Capture Ratio = UCR / DCR.
              </p>
              <p>
                Based on full available monthly return history from the selected start date.{' '}
                <span className="font-medium">Window-independent</span> — same monthly series regardless of active rolling window tab.
              </p>
              <p className="text-gray-300">
                This matches the Freefincal capture ratio methodology. Compare with the arithmetic-mean UCR/DCR table above which uses overlapping rolling-return observations.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 6b: Per-fund scatter + alpha charts ───────────────── */}
      <div className="space-y-6">
        <SectionHeader
          title="Capture Scatter &amp; Rolling Alpha"
          subtitle="Left: fund return vs benchmark return per observation · Right: fund − benchmark over time"
        />
        {captureStats.map(({ fund, color, scatterData, alphaData }) => {
          if (!scatterData.length) return null;

          // Alpha gradient: split at y=0
          const alphas = alphaData.map((d) => d.alpha);
          const aMax = Math.max(...alphas);
          const aMin = Math.min(...alphas);
          const gradId = `alphaGrad_${fund.scheme_code}`;
          const splitOffset = aMax === aMin
            ? '50%'
            : `${Math.max(0, Math.min(100, (aMax / (aMax - aMin)) * 100)).toFixed(1)}%`;

          return (
            <div key={fund.scheme_code}>
              {/* Fund name row */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-sm font-semibold text-gray-800" title={fund.scheme_name}>
                  {shortName(fund.scheme_name)}
                </span>
              </div>

              {/* Side-by-side: scatter (2/5) + alpha chart (3/5) */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {/* Scatter */}
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400 mb-1 text-center">Benchmark vs Fund returns</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
                      {/* Background zones */}
                      <ReferenceArea
                        x1={scatterDomain.x[0]} x2={0}
                        y1={scatterDomain.y[0]} y2={scatterDomain.y[1]}
                        fill="#fee2e2" fillOpacity={0.3}
                      />
                      <ReferenceArea
                        x1={0} x2={scatterDomain.x[1]}
                        y1={scatterDomain.y[0]} y2={scatterDomain.y[1]}
                        fill="#dcfce7" fillOpacity={0.3}
                      />
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis
                        type="number" dataKey="x"
                        domain={scatterDomain.x}
                        tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false}
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                        label={{ value: 'Benchmark', position: 'insideBottom', offset: -12, fontSize: 10, fill: '#9ca3af' }}
                      />
                      <YAxis
                        type="number" dataKey="y"
                        domain={scatterDomain.y}
                        tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                        label={{ value: 'Fund', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: '#9ca3af' }}
                      />
                      <ZAxis range={[18, 18]} />
                      <Tooltip content={<CaptureScatterTooltip />} />
                      {/* Parity diagonal */}
                      <ReferenceLine
                        segment={[
                          { x: scatterDomain.x[0], y: scatterDomain.x[0] },
                          { x: scatterDomain.x[1], y: scatterDomain.x[1] },
                        ]}
                        stroke="#9ca3af" strokeDasharray="4 2"
                      />
                      {/* Axis lines */}
                      <ReferenceLine x={0} stroke="#d1d5db" />
                      <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" />
                      <Scatter
                        data={scatterData}
                        shape={(props) => {
                          const { cx, cy, payload } = props;
                          const above = payload.y > payload.x;
                          return (
                            <circle
                              cx={cx} cy={cy} r={3.5}
                              fill={above ? '#16a34a' : '#dc2626'}
                              fillOpacity={0.65}
                            />
                          );
                        }}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Alpha area chart */}
                <div className="sm:col-span-3">
                  <p className="text-xs text-gray-400 mb-1 text-center">Rolling alpha (Fund − Benchmark)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={alphaData} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset={splitOffset} stopColor="#16a34a" stopOpacity={0.65} />
                          <stop offset={splitOffset} stopColor="#dc2626" stopOpacity={0.65} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis
                        dataKey="date" tickFormatter={tickFormatter}
                        tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={<AlphaTooltip />} />
                      <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1.5} />
                      <Area
                        type="monotone" dataKey="alpha"
                        stroke={color} strokeWidth={1.5}
                        fill={`url(#${gradId})`}
                        baseValue={0}
                        dot={false}
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketCaptureCard;
