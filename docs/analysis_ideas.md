# Mutual Fund Data: Analysis Ideas for Finance Professionals

This document outlines 10 analysis concepts that can be performed using the historical Indian mutual fund NAV dataset sourced from AMFI (Association of Mutual Funds in India).

## Dataset Overview

| Property | Details |
|---|---|
| **Source** | AMFI (amfiindia.com) |
| **Coverage** | April 2006 – present (daily NAV) |
| **Schemes** | ~8,200 active scheme codes |
| **Key Fields** | `scheme_code`, `scheme_name`, `nav`, `date`, `isin_payout`, `isin_reinvestment` |
| **Database** | SQLite (`funds.db`) — tables: `scheme_data`, `nav_data`, `isin_data` |
| **Raw Files** | ~6,900 semicolon-delimited CSV files in `data/{YYYY}/{MM}/{DD}.csv` |

---

## 1. Performance Attribution & Benchmarking

**Concept:** Compute rolling returns (1Y / 3Y / 5Y / 10Y) for every scheme and compare them against category averages or relevant index fund NAVs (Nifty 50 ETFs, Sensex funds — also present in this dataset). Identify consistent alpha generators vs. closet index huggers.

**Key Fields:** `nav`, `date`, `scheme_name` (parse category and plan type)

**Use Case:** Fund selection, advisor due diligence, model portfolio construction.

---

## 2. Fund Manager / AMC Track Record Analysis

**Concept:** Group schemes by AMC (parseable from `scheme_name` prefix) and compare risk-adjusted returns (Sharpe ratio, Sortino ratio, Calmar ratio) across fund houses over time. Since Direct plans were introduced in January 2013, the Regular vs. Direct NAV divergence also quantifies total distributor commission drag over any holding period.

**Key Fields:** `scheme_name` (AMC prefix), `nav`, `date`

**Use Case:** AMC-level due diligence, investor education on cost of advice.

---

## 3. SEBI Recategorization Impact Study (2018)

**Concept:** SEBI mandated a sweeping fund recategorization in 2018, forcing AMCs to merge, rename, and restructure schemes. Detect these events by tracking `scheme_code` continuity and `scheme_name` changes around mid-2018. Measure pre- vs. post-recategorization performance to assess whether the structural changes benefited investors.

**Key Fields:** `scheme_code`, `scheme_name`, `date`, `nav`

**Use Case:** Regulatory impact research, academic finance studies.

---

## 4. Drawdown & Volatility Analysis During Market Stress

**Concept:** Compute maximum drawdown (peak-to-trough NAV decline) and recovery time for all equity funds during known stress events:
- 2008 Global Financial Crisis
- 2013 Taper Tantrum
- 2016 Demonetization shock
- 2020 COVID crash (February–March)
- 2022 Global rate hike cycle

Rank funds by drawdown severity and recovery speed to identify defensive funds and crisis performers.

**Key Fields:** `nav`, `date`, category filter from `scheme_name`

**Use Case:** Risk management, stress testing, downside protection analysis.

---

## 5. Expense Ratio Proxy: Regular vs. Direct NAV Divergence

**Concept:** Direct plans (zero distributor commission) and Regular plans of the same underlying fund track an identical portfolio. Their NAV divergence over time represents the embedded total expense ratio (TER) difference. By tracking this spread daily post-January 2013, you can reconstruct approximate expense ratio trends and total cost of distribution for any fund.

**Key Fields:** Pair matching via `scheme_name` (strip "Direct" / "Regular" tokens), `nav`, `date`

**Use Case:** Cost transparency analysis, MFD/RIA impact quantification.

---

## 6. Category Flow & Industry Structure Trend Analysis

**Concept:** While raw AUM data is not available, the count of active scheme codes per category over time is a proxy for product innovation and regulatory shifts. Plot the rise of Direct plans (2013), Index funds and ETFs (2018 onwards), Overnight funds (2019), and Flexi Cap funds (2020) to map the structural evolution of the Indian MF industry over 19 years.

**Key Fields:** `scheme_name` (category parsing), `scheme_code` count, `date`

**Use Case:** Industry research, competitive landscape analysis, product strategy.

---

## 7. SIP Return Simulation & XIRR Analysis

**Concept:** Simulate monthly Systematic Investment Plan (SIP) investments — a fixed INR amount divided by NAV gives units purchased each month. Compute XIRR (Extended Internal Rate of Return) across all funds for any time window and entry point. Compare SIP vs. lump-sum outcomes across bull and bear market start dates. This is a core retail investor decision-support tool.

**Key Fields:** `nav`, `date`, `scheme_code`

**Use Case:** Retail investor advisory, goal-based financial planning, distributor tools.

---

## 8. Factor Analysis & Style Drift Detection

**Concept:** Decompose equity fund NAV returns into factor exposures (value, momentum, size/market cap, quality) using Returns-Based Style Analysis (RBSA). Since index funds for Nifty 50, Nifty Midcap, Nifty Smallcap, and Nifty Next 50 are all in this dataset, no external data is required. Detect style drift — e.g., when a self-described Large Cap fund started behaving like a Mid Cap fund. Particularly relevant post-SEBI 2018 reclassification.

**Key Fields:** `nav`, `date` — combined with index fund/ETF NAVs from the same dataset

**Use Case:** Portfolio construction, style-box analysis, regulatory compliance verification.

---

## 9. Survivorship Bias Quantification

**Concept:** The dataset includes both active and defunct funds — scheme codes that stopped appearing in later daily files represent merged, wound-down, or discontinued schemes. By identifying these funds and analyzing their terminal performance, you can quantify survivorship bias: the systematic overestimation of historical returns that occurs when analysis is limited to only funds that survived. This is critical for honest, academically rigorous performance reporting.

**Key Fields:** `scheme_code`, `date` (first and last appearance), `nav`

**Use Case:** Academic research, honest performance benchmarking, fund ratings methodology.

---

## 10. Multi-Asset Correlation & Portfolio Optimization

**Concept:** The dataset spans equity funds, Gold ETFs, Gilt funds, Liquid funds, arbitrage funds, and international FoFs — covering most major investable asset classes accessible to Indian retail investors. Compute rolling correlation matrices across these asset classes and apply Markowitz mean-variance optimization to find the efficient frontier using only Indian MF products. Extend to Black-Litterman or risk-parity frameworks for more robust allocations.

**Key Fields:** `nav`, `date`, category filter from `scheme_name`

**Use Case:** Asset allocation strategy, model portfolio design, robo-advisory engines.

---

## Practical Starting Point

The SQLite database (`funds.db`) is the fastest entry point. Build it using `src/amfi/amfi_data_process.py`.

```sql
-- Example: Get all Large Cap Growth fund NAVs
SELECT n.date, s.scheme_name, n.nav
FROM nav_data n
JOIN scheme_data s ON n.scheme_code = s.scheme_code
WHERE s.scheme_name LIKE '%Large Cap%'
  AND s.scheme_name LIKE '%Growth%'
ORDER BY n.date;
```

```sql
-- Example: Find Direct vs Regular plan pairs for a fund house
SELECT scheme_code, scheme_name
FROM scheme_data
WHERE scheme_name LIKE 'HDFC%'
  AND scheme_name LIKE '%Flexi Cap%'
ORDER BY scheme_name;
```

**Recommended tools:** Python (`pandas`, `sqlite3`, `scipy`, `matplotlib`) or R (`tidyverse`, `PerformanceAnalytics`, `RSQLite`).
