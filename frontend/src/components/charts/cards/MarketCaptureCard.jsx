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
  captureStats,
  scatterDomain,
}) => {
  // Get month counts from first fund's freefincal data for subtitle
  const firstFreefincal = captureStats[0]?.freefincal;
  const upMonths = firstFreefincal?.upMonths ?? 0;
  const downMonths = firstFreefincal?.downMonths ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Market Capture Analysis</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          How does each fund capture gains and protect against losses relative to the benchmark?
        </p>
      </div>

      {/* ── Section 1: Upside / Downside Capture (monthly CAGR method) ──── */}
      <div>
        <SectionHeader
          title="Upside / Downside Capture"
          subtitle={`Monthly CAGR method · ${upMonths} up months · ${downMonths} down months · non-overlapping monthly returns from selected date range`}
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
            <span className="font-medium">UCR</span> (Upside Capture Ratio) = fund CAGR in up-benchmark months / benchmark CAGR in those months × 100.{' '}
            <span className="text-emerald-600 font-medium">&ge;100</span> = captured more of benchmark gains.
          </p>
          <p>
            <span className="font-medium">DCR</span> (Downside Capture Ratio) = same logic for down-benchmark months.{' '}
            <span className="text-emerald-600 font-medium">&le;100</span> = protected more in drawdowns.
          </p>
          <p>
            <span className="font-medium">Capture Ratio</span> = UCR / DCR.{' '}
            <span className="text-emerald-600 font-medium">&gt;1x</span> = captured more upside than downside (ideal asymmetry).
          </p>
          <p>
            <span className="font-medium">Methodology:</span> Non-overlapping monthly returns filtered by benchmark sign.
            CAGR computed via product formula: [∏(1+rᵢ)]^(12/n) − 1.{' '}
            <span className="font-medium">Window-independent</span> — same result regardless of rolling window tab.
          </p>
        </div>
      </div>

      {/* ── Section 2: Per-fund scatter + alpha charts ───────────────── */}
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
