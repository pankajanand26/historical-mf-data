import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Cell,
} from 'recharts';
import { FUND_COLORS, BENCHMARK_COLOR } from '../../../utils/constants';
import { shortName, shortNameMd } from '../../../utils/formatters';
import { SectionHeader } from '../../ui';

/**
 * Compute lumpsum vs SIP outcomes for a given fund using monthly returns.
 * 
 * @param {Array} monthlyData - Array of {date, value} monthly returns
 * @param {number} totalInvestment - Total amount to invest
 * @param {number} periodYears - Investment period in years
 * @returns {Object} - Comparison results
 */
function compareLumpsumVsSIP(monthlyData, totalInvestment = 100000, periodYears = 5) {
  if (!monthlyData?.length) return null;
  
  // Sort by date ascending
  const sorted = [...monthlyData].sort((a, b) => a.date.localeCompare(b.date));
  const periodMonths = periodYears * 12;
  
  // Need at least periodMonths of data
  if (sorted.length < periodMonths) return null;
  
  const sipMonthly = totalInvestment / periodMonths;
  const results = [];
  
  // Compute for all possible start dates where we have full period data
  for (let startIdx = 0; startIdx <= sorted.length - periodMonths; startIdx++) {
    const periodData = sorted.slice(startIdx, startIdx + periodMonths);
    const startDate = periodData[0].date;
    const endDate = periodData[periodMonths - 1].date;
    
    // Lumpsum: invest all at start, compound through all months
    let lumpsumValue = totalInvestment;
    for (const month of periodData) {
      lumpsumValue *= (1 + month.value);
    }
    
    // SIP: invest sipMonthly at start of each month, compound remaining periods
    let sipValue = 0;
    for (let m = 0; m < periodMonths; m++) {
      // Investment for this month grows through remaining periods
      let monthInvestment = sipMonthly;
      for (let r = m; r < periodMonths; r++) {
        monthInvestment *= (1 + periodData[r].value);
      }
      sipValue += monthInvestment;
    }
    
    // Calculate CAGRs
    const lumpsumCAGR = (Math.pow(lumpsumValue / totalInvestment, 1 / periodYears) - 1) * 100;
    const sipCAGR = (Math.pow(sipValue / totalInvestment, 1 / periodYears) - 1) * 100; // Approximate
    
    results.push({
      startDate,
      endDate,
      lumpsumValue: Math.round(lumpsumValue),
      sipValue: Math.round(sipValue),
      lumpsumCAGR,
      sipCAGR,
      winner: lumpsumValue > sipValue ? 'lumpsum' : sipValue > lumpsumValue ? 'sip' : 'tie',
      advantage: Math.abs(lumpsumValue - sipValue),
      advantagePct: ((Math.abs(lumpsumValue - sipValue) / totalInvestment) * 100),
    });
  }
  
  // Aggregate statistics
  const lumpsumWins = results.filter(r => r.winner === 'lumpsum').length;
  const sipWins = results.filter(r => r.winner === 'sip').length;
  const avgLumpsum = results.reduce((s, r) => s + r.lumpsumValue, 0) / results.length;
  const avgSip = results.reduce((s, r) => s + r.sipValue, 0) / results.length;
  const avgLumpsumCAGR = results.reduce((s, r) => s + r.lumpsumCAGR, 0) / results.length;
  const avgSipCAGR = results.reduce((s, r) => s + r.sipCAGR, 0) / results.length;
  
  return {
    results,
    summary: {
      totalPeriods: results.length,
      lumpsumWins,
      sipWins,
      lumpsumWinPct: (lumpsumWins / results.length) * 100,
      sipWinPct: (sipWins / results.length) * 100,
      avgLumpsum: Math.round(avgLumpsum),
      avgSip: Math.round(avgSip),
      avgLumpsumCAGR,
      avgSipCAGR,
      overallWinner: lumpsumWins > sipWins ? 'lumpsum' : sipWins > lumpsumWins ? 'sip' : 'tie',
    },
  };
}

/**
 * Format number as lakhs (Indian numbering)
 */
const fmtLakh = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

/**
 * Lumpsum vs SIP Comparison Card
 * Compares lumpsum investment at period start vs monthly SIP over the same period.
 */
const LumpsumVsSipCard = ({ data }) => {
  const funds = data?.funds ?? [];
  const monthlyReturns = data?.monthly_returns;
  
  const [investment, setInvestment] = useState(100000);
  const [periodYears, setPeriodYears] = useState(5);
  const [activeFund, setActiveFund] = useState(funds[0]?.scheme_code ?? null);
  
  const fundOptions = useMemo(() => [
    { key: 'benchmark', name: data?.benchmark_name ?? 'Benchmark', color: BENCHMARK_COLOR },
    ...funds.map((f, i) => ({
      key: `fund_${f.scheme_code}`,
      name: f.scheme_name,
      color: FUND_COLORS[i % FUND_COLORS.length],
      code: f.scheme_code,
    })),
  ], [data?.benchmark_name, funds]);
  
  const selectedKey = activeFund === 'benchmark' ? 'benchmark' : `fund_${activeFund}`;
  const selectedFund = fundOptions.find(f => f.key === selectedKey || f.code === activeFund);
  
  // Compute comparison data
  const comparison = useMemo(() => {
    if (!monthlyReturns?.[selectedKey]) return null;
    return compareLumpsumVsSIP(monthlyReturns[selectedKey], investment, periodYears);
  }, [monthlyReturns, selectedKey, investment, periodYears]);
  
  // Build chart data - show outcome for each starting year
  const chartData = useMemo(() => {
    if (!comparison?.results?.length) return [];
    
    // Group by starting year and average the results
    const byYear = {};
    for (const r of comparison.results) {
      const year = r.startDate.split('-')[0];
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(r);
    }
    
    return Object.entries(byYear).map(([year, periods]) => ({
      year,
      lumpsumAvg: Math.round(periods.reduce((s, p) => s + p.lumpsumValue, 0) / periods.length),
      sipAvg: Math.round(periods.reduce((s, p) => s + p.sipValue, 0) / periods.length),
      lumpsumWins: periods.filter(p => p.winner === 'lumpsum').length,
      sipWins: periods.filter(p => p.winner === 'sip').length,
      count: periods.length,
    }));
  }, [comparison]);
  
  if (!monthlyReturns) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Monthly returns data required for this analysis.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Lumpsum vs SIP Comparison</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Compare lumpsum investment at period start vs monthly SIP over the same duration
        </p>
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Investment</label>
          <input
            type="number"
            value={investment}
            onChange={(e) => setInvestment(Math.max(10000, parseInt(e.target.value) || 100000))}
            className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Period</label>
          <select
            value={periodYears}
            onChange={(e) => setPeriodYears(parseInt(e.target.value))}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
          >
            {[1, 2, 3, 5, 7, 10].map((y) => (
              <option key={y} value={y}>{y}Y</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Fund selector */}
      <div className="flex gap-2 flex-wrap">
        {fundOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveFund(opt.key === 'benchmark' ? 'benchmark' : opt.code)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-2 ${
              selectedKey === opt.key
                ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700 font-medium'
                : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
            <span className="max-w-[100px] truncate">{shortNameMd(opt.name)}</span>
          </button>
        ))}
      </div>
      
      {/* Summary Statistics */}
      {comparison?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-[10px] text-blue-600 uppercase tracking-wider font-semibold">Lumpsum Wins</p>
            <p className="text-lg font-bold text-blue-700">{comparison.summary.lumpsumWinPct.toFixed(0)}%</p>
            <p className="text-[10px] text-blue-500">{comparison.summary.lumpsumWins} of {comparison.summary.totalPeriods}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">SIP Wins</p>
            <p className="text-lg font-bold text-emerald-700">{comparison.summary.sipWinPct.toFixed(0)}%</p>
            <p className="text-[10px] text-emerald-500">{comparison.summary.sipWins} of {comparison.summary.totalPeriods}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Avg Lumpsum</p>
            <p className="text-lg font-bold text-gray-800">{fmtLakh(comparison.summary.avgLumpsum)}</p>
            <p className="text-[10px] text-gray-500">CAGR: {comparison.summary.avgLumpsumCAGR.toFixed(1)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Avg SIP</p>
            <p className="text-lg font-bold text-gray-800">{fmtLakh(comparison.summary.avgSip)}</p>
            <p className="text-[10px] text-gray-500">CAGR: {comparison.summary.avgSipCAGR.toFixed(1)}%</p>
          </div>
        </div>
      )}
      
      {/* Winner Banner */}
      {comparison?.summary && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${
          comparison.summary.overallWinner === 'lumpsum' 
            ? 'bg-blue-100 border border-blue-200' 
            : comparison.summary.overallWinner === 'sip'
              ? 'bg-emerald-100 border border-emerald-200'
              : 'bg-gray-100 border border-gray-200'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
            comparison.summary.overallWinner === 'lumpsum' 
              ? 'bg-blue-500 text-white' 
              : comparison.summary.overallWinner === 'sip'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-400 text-white'
          }`}>
            {comparison.summary.overallWinner === 'lumpsum' ? '💰' : comparison.summary.overallWinner === 'sip' ? '📈' : '⚖️'}
          </div>
          <div>
            <p className={`font-semibold ${
              comparison.summary.overallWinner === 'lumpsum' 
                ? 'text-blue-800' 
                : comparison.summary.overallWinner === 'sip'
                  ? 'text-emerald-800'
                  : 'text-gray-700'
            }`}>
              {comparison.summary.overallWinner === 'lumpsum' 
                ? 'Lumpsum wins more often!' 
                : comparison.summary.overallWinner === 'sip'
                  ? 'SIP wins more often!'
                  : 'It\'s a tie!'}
            </p>
            <p className="text-xs text-gray-600">
              Over {comparison.summary.totalPeriods} rolling {periodYears}-year periods, 
              {comparison.summary.overallWinner === 'lumpsum' 
                ? ` lumpsum outperformed in ${comparison.summary.lumpsumWinPct.toFixed(0)}% of cases` 
                : comparison.summary.overallWinner === 'sip'
                  ? ` SIP outperformed in ${comparison.summary.sipWinPct.toFixed(0)}% of cases`
                  : ' neither strategy consistently outperforms'}
            </p>
          </div>
        </div>
      )}
      
      {/* Chart */}
      {chartData.length > 0 && (
        <div>
          <SectionHeader 
            title="Outcome by Entry Year" 
            subtitle="Average final value by starting year" 
          />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 11, fill: '#6b7280' }} 
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 10, fill: '#6b7280' }} 
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value, name) => [fmtLakh(value), name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <ReferenceLine y={investment} stroke="#9ca3af" strokeDasharray="4 2" label={{ value: 'Invested', fontSize: 10, fill: '#9ca3af' }} />
              <Bar dataKey="lumpsumAvg" name="Lumpsum" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sipAvg" name="SIP" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Explanation */}
      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
        <p className="font-medium mb-1">How this works:</p>
        <ul className="list-disc list-inside space-y-0.5 text-[11px]">
          <li><strong>Lumpsum:</strong> Entire {fmtLakh(investment)} invested at the start of the period</li>
          <li><strong>SIP:</strong> {fmtLakh(Math.round(investment / (periodYears * 12)))}/month invested over {periodYears} years</li>
          <li>Comparison done for all possible {periodYears}-year periods in the data</li>
          <li>Lumpsum typically wins in bull markets; SIP wins in volatile or falling markets (rupee cost averaging)</li>
        </ul>
      </div>
      
      {!comparison && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>Insufficient data for {periodYears}-year comparison.</p>
          <p className="text-xs text-gray-400 mt-1">Try a shorter period or different fund.</p>
        </div>
      )}
    </div>
  );
};

export default LumpsumVsSipCard;
