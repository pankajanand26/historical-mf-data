// ─── Formatting utilities ─────────────────────────────────────────────────────

/**
 * Format a number as percentage with 2 decimal places.
 * Returns 'N/A' if the value is null, undefined, or NaN.
 */
export const fmt2 = (v) => (v == null || isNaN(v) ? 'N/A' : `${v.toFixed(2)}%`);

/**
 * Format a number as percentage with 1 decimal place.
 */
export const fmt1 = (v) => (v == null || isNaN(v) ? 'N/A' : `${v.toFixed(1)}%`);

/**
 * Format a number as a ratio with 2 decimal places (no % sign).
 */
export const fmtRatio = (v) => (v == null || isNaN(v) ? 'N/A' : v.toFixed(2));

/**
 * Format a number in Indian currency format (Lakhs/Crores).
 * e.g., 1500000 → "₹15.00 L", 25000000 → "₹2.50 Cr"
 */
export const fmtLakh = (v) => {
  if (v == null || isNaN(v)) return 'N/A';
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
};

/**
 * Truncate a fund name to 42 characters with ellipsis.
 */
export const shortName = (name) =>
  name?.length > 42 ? name.slice(0, 39) + '...' : (name ?? '');

/**
 * Truncate a fund name to 30 characters (medium length).
 */
export const shortNameMd = (name) =>
  name?.length > 30 ? name.slice(0, 27) + '...' : (name ?? '');

/**
 * Format a date string (YYYY-MM-DD) for chart tick display.
 * Returns "MM/YY" format.
 */
export const tickFormatter = (dateStr) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return `${month}/${year?.slice(2)}`;
};

/**
 * Format a date string for display (DD MMM YYYY).
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};
