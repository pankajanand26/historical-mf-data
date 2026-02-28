// ─── Fund scoring and grading utilities ───────────────────────────────────────

/**
 * Normalize each fund's metrics into 0–100 scores across 5 dimensions.
 * Min-max scaled within the comparison set.
 *
 * Dimensions:
 * - returns: avgAlpha (higher = better)
 * - risk: sharpeFund (higher = better)
 * - consistency: outperformedPct (higher = better)
 * - capture: captureRatio (higher = better)
 * - drawdown: max_drawdown (less negative = better)
 *
 * @param {Array} allStats - Stats computed by computeAllStats()
 * @param {Object} analyticsData - Analytics data with drawdown info
 * @returns {Array} - Array of fund scores with raw values, normalized scores, and overall grade
 */
export function computeFundScores(allStats, analyticsData) {
  const dims = ['returns', 'risk', 'consistency', 'capture', 'drawdown'];

  // Extract raw values for each dimension
  const raw = allStats.map((s) => {
    let dd = null;
    if (analyticsData?.funds) {
      const af = analyticsData.funds.find((f) => f.scheme_code === s.fund.scheme_code);
      if (af) dd = af.drawdown?.max_drawdown ?? null; // negative, less negative = better
    }
    return {
      fund: s.fund,
      color: s.color,
      raw: {
        returns: s.outperf?.avgAlpha ?? null,
        risk: s.vol?.sharpeFund ?? null,
        consistency: s.outperf?.outperformedPct ?? null,
        capture: s.capture?.captureRatio ?? null,
        drawdown: dd,
      },
    };
  });

  // Normalize each dimension to 0-100 scale
  const normalize = (dim) => {
    const vals = raw.map((r) => r.raw[dim]).filter((v) => v != null && !isNaN(v));
    if (vals.length === 0) return raw.map(() => null);

    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const range = hi - lo;

    return raw.map((r) => {
      const v = r.raw[dim];
      if (v == null || isNaN(v)) return null;
      // If all values are the same, give a neutral score
      return range === 0 ? 75 : ((v - lo) / range) * 100;
    });
  };

  // Compute normalized scores for all dimensions
  const normalized = {};
  for (const d of dims) normalized[d] = normalize(d);

  // Build final result with scores and overall grade
  return raw.map((r, i) => {
    const scores = {};
    for (const d of dims) scores[d] = normalized[d][i];

    // Overall score is average of non-null dimension scores
    const valid = dims.filter((d) => scores[d] != null);
    const overall = valid.length ? valid.reduce((s, d) => s + scores[d], 0) / valid.length : null;

    return { ...r, scores, overall };
  });
}

/**
 * Convert a numeric score (0-100) to a letter grade with color.
 *
 * Grading scale:
 * - 85+ → A+ (bright green)
 * - 70-84 → A (green)
 * - 55-69 → B (yellow)
 * - 40-54 → C (orange)
 * - <40 → D (red)
 */
export function scoreGrade(score) {
  if (score == null || isNaN(score)) return { grade: 'N/A', color: '#64748b' };
  if (score >= 85) return { grade: 'A+', color: '#22c55e' };
  if (score >= 70) return { grade: 'A', color: '#4ade80' };
  if (score >= 55) return { grade: 'B', color: '#facc15' };
  if (score >= 40) return { grade: 'C', color: '#fb923c' };
  return { grade: 'D', color: '#ef4444' };
}

/**
 * Get a background color for a score cell (for heatmap-style display).
 * Returns a subtle background that works well with light theme.
 */
export function scoreColor(score) {
  if (score == null || isNaN(score)) return '#f1f5f9'; // slate-100
  if (score >= 70) return '#dcfce7'; // green-100
  if (score >= 40) return '#fef3c7'; // amber-100
  return '#fee2e2'; // red-100
}

/**
 * Get dimension display label.
 */
export function getDimensionLabel(dim) {
  const labels = {
    returns: 'Returns (Alpha)',
    risk: 'Risk-Adjusted (Sharpe)',
    consistency: 'Consistency',
    capture: 'Capture Ratio',
    drawdown: 'Drawdown',
  };
  return labels[dim] ?? dim;
}
