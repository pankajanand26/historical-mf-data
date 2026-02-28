/**
 * NFO Warning Banner
 * Shows a warning when a selected fund has < 36 months of NAV data.
 * Rolling return analysis requires at least 36 months for meaningful 3Y windows.
 */

const NfoWarning = ({ data }) => {
  if (!data?.funds?.length) return null;

  // Check each fund for insufficient data
  const warnings = data.funds
    .map((fund) => {
      // Find the longest window available for this fund
      const windows = fund.windows ?? [];
      const maxDataPoints = Math.max(0, ...windows.map((w) => w.data?.length ?? 0));
      
      // Also check if 3Y window exists and has sufficient data
      const threeYWindow = windows.find((w) => w.window === '3y');
      const threeYDataPoints = threeYWindow?.data?.length ?? 0;
      
      // Calculate approximate months of data
      // Rolling returns are typically computed weekly, so ~4 data points per month
      // For 3Y window, we need at least 36 months = 36 rolling periods minimum
      const hasInsufficientData = threeYDataPoints < 12; // Less than ~12 observations suggests limited history
      
      if (hasInsufficientData) {
        return {
          name: fund.scheme_name,
          dataPoints: threeYDataPoints,
          maxPoints: maxDataPoints,
        };
      }
      return null;
    })
    .filter(Boolean);

  if (warnings.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-amber-800">Limited Historical Data</h4>
          <div className="mt-1 text-xs text-amber-700 space-y-1">
            {warnings.map((w, i) => (
              <p key={i}>
                <span className="font-medium">{w.name}</span> has limited data for the selected window.
                Rolling return analysis may be unreliable.
              </p>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-amber-600">
            For robust analysis, funds should have at least 3 years of NAV history.
            Consider using shorter rolling windows (1Y) for newer funds.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NfoWarning;
