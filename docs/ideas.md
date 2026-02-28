# Feature Ideas: MF Performance Analyzer

> This document captures the full feature roadmap for the MF Performance Analyzer.
> Features marked **[Focus]** have detailed specs and implementation plans below.

---

## Roadmap Overview

| # | Feature | Category | Complexity | Value |
|---|---|---|---|---|
| 1 | Category Peers Comparison | Analysis | Medium | High |
| 2 | Expense Ratio Impact | Analysis | Low | High |
| 3 | Factor Exposure (RBSA) | Analysis | High | Medium |
| 4 | Portfolio Overlap Analysis | Analysis | Medium | Medium |
| 5 | Underwater Chart | Visualization | Low | Medium |
| 6 | Return Heatmap by Entry Date | Visualization | Medium | High |
| 7 | Lumpsum vs SIP Comparison | Visualization | Low | High |
| **8** | **Reverse SIP Calculator** | **Goal-Based** | **Medium** | **High** |
| **9** | **Retirement Corpus Simulator** | **Goal-Based** | **High** | **High** |
| 10 | NFO / New Fund Warning | Utility | Low | Medium |
| 11 | Tax Harvesting Helper | Utility | Medium | High |
| 12 | Rebalancing Suggester | Utility | Medium | Medium |

---

## Feature 8: Reverse SIP Calculator [Focus]

### Problem Statement

The existing SIP Planner answers: _"I invest ₹10,000/month for 10 years — what will I get?"_

The Reverse SIP Calculator answers the inverse: _"I need ₹1 crore in 10 years — how much do I invest per month?"_

This is what investors actually think about. They start from a goal (child's education, house down payment, wedding) and work backwards to a required monthly commitment. The key insight is that the answer is not a single number — it depends heavily on which return the fund actually delivers. By anchoring to the fund's own historical return distribution, we give the investor a realistic range.

---

### User Inputs

| Input | Default | Range | Description |
|---|---|---|---|
| Target Corpus (₹) | 25,00,000 | Any positive | The goal amount in rupees |
| Time Horizon (years) | 10 | 1–30 | How many years to accumulate |
| Return Percentile View | P10/P50/P90 | — | Which scenario rows to show |

---

### Outputs

**Primary output — SIP Required Table:**

| Scenario | Return (CAGR) | Required SIP/month | Total Invested | Gain |
|---|---|---|---|---|
| Bear (P10) | 8.2% | ₹14,200 | ₹17,04,000 | ₹7,96,000 |
| Base (P50) | 13.5% | ₹10,600 | ₹12,72,000 | ₹12,28,000 |
| Bull (P90) | 18.7% | ₹7,900 | ₹9,48,000 | ₹15,52,000 |

**Secondary output — Required Return to meet goal at different SIP amounts:**

Show a sensitivity curve: "If you can only invest ₹8,000/month, you need the fund to deliver 15.6% CAGR. Here's what % of historical periods matched that."

---

### Mathematical Specification

**Core formula — SIP Future Value:**
```
FV = P × [(1 + r)^n − 1] / r × (1 + r)
```
Where:
- `P` = monthly SIP amount
- `r` = monthly rate = `(1 + annualReturn)^(1/12) − 1`
- `n` = total months = `years × 12`

**Inverse — Required SIP given FV, r, n:**
```
P = FV × r / [(1 + r) × ((1 + r)^n − 1)]
```

This is a closed-form solution. No iteration needed.

**Required return given P, FV, n** — binary search (already implemented in `sipUtils.js:requiredAnnualReturn`):
```
Find r such that sipFV(r, P, n) = FV
Search range: r ∈ [−0.5, 5.0], 80 iterations of bisection
```

**Percentile extraction from historical distribution:**
```
returnDistPct = extractReturnDist(data, fundCode, windowId)
sorted = sort(returnDistPct)
pct(p) = sorted[floor(p/100 × n)]   // 0-indexed
```

---

### New Utility Functions (`sipUtils.js`)

```js
/**
 * Required monthly SIP to reach a target FV given annual return and duration.
 * Closed-form inverse of sipFV.
 *
 * @param {number} annualReturn - Annual return as decimal (e.g. 0.12)
 * @param {number} months       - Investment duration in months
 * @param {number} target       - Target corpus in ₹
 * @returns {number}            - Required monthly SIP in ₹
 */
export function requiredMonthlySIP(annualReturn, months, target) {
  if (months <= 0) return target;
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
  if (Math.abs(r) < 1e-10) return target / months;          // ~0% return
  return target * r / ((1 + r) * (Math.pow(1 + r, months) - 1));
}

/**
 * Build the reverse SIP scenario table for P10 / P25 / P50 / P75 / P90.
 * Returns rows suitable for direct table rendering.
 *
 * @param {number[]} returnDistPct  - Historical CAGR distribution in %
 * @param {number}   target         - Target corpus in ₹
 * @param {number}   years          - Horizon in years
 * @returns {Object[]}              - Array of scenario rows
 */
export function computeReverseSipScenarios(returnDistPct, target, years) {
  const months = years * 12;
  const sorted = [...returnDistPct].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)] / 100;

  return [10, 25, 50, 75, 90].map((p) => {
    const annualReturn = pct(p);
    const sip = requiredMonthlySIP(annualReturn, months, target);
    const totalInvested = sip * months;
    return {
      label: `P${p}`,
      isBear: p <= 25,
      isBull: p >= 75,
      annualReturnPct: annualReturn * 100,
      requiredSIP: Math.ceil(sip),
      totalInvested: Math.round(totalInvested),
      totalGain: Math.round(target - totalInvested),
      wealthMultiple: +(target / totalInvested).toFixed(2),
    };
  });
}

/**
 * Sensitivity: for a fixed SIP amount and horizon, compute
 * the required CAGR and what % of historical observations meet it.
 *
 * @param {number[]} returnDistPct  - Historical CAGR distribution in %
 * @param {number}   monthlySIP     - Fixed monthly SIP in ₹
 * @param {number}   years          - Horizon in years
 * @param {number}   target         - Target corpus in ₹
 * @returns {{ requiredReturn: number, hitRate: number }}
 */
export function sipSensitivity(returnDistPct, monthlySIP, years, target) {
  const months = years * 12;
  const req = requiredAnnualReturn(monthlySIP, months, target); // existing function
  const hits = returnDistPct.filter((r) => r / 100 >= req).length;
  return {
    requiredReturnPct: req * 100,
    hitRatePct: (hits / returnDistPct.length) * 100,
  };
}
```

---

### UI Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│  REVERSE SIP CALCULATOR                                                   │
│  "How much do I need to invest monthly to reach my goal?"                 │
├──────────────────────────────────────────────────────────────────────────┤
│  TARGET  [ ₹ 25,00,000  ]    HORIZON  [ 10 years ]                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Based on HDFC Flexi Cap Fund · 5Y historical return distribution         │
│  (48 observations)                                                        │
│                                                                           │
│  ┌──────────┬──────────┬──────────────────┬──────────────┬──────────┐    │
│  │ Scenario │  CAGR    │ SIP / month      │ Total invest │  Gain    │    │
│  ├──────────┼──────────┼──────────────────┼──────────────┼──────────┤    │
│  │ Bear P10 │  8.2%    │ ₹ 14,200         │ ₹ 17,04,000  │ ₹7.96L  │    │
│  │ P25      │ 10.8%    │ ₹ 12,100         │ ₹ 14,52,000  │ ₹10.48L │    │
│  │ Base P50 │ 13.5%    │ ₹ 10,600    ◄    │ ₹ 12,72,000  │ ₹12.28L │    │
│  │ P75      │ 15.9%    │ ₹  9,300         │ ₹ 11,16,000  │ ₹13.84L │    │
│  │ Bull P90 │ 18.7%    │ ₹  7,900         │ ₹  9,48,000  │ ₹15.52L │    │
│  └──────────┴──────────┴──────────────────┴──────────────┴──────────┘    │
│                                                                           │
│  ── SENSITIVITY ──────────────────────────────────────────────────────── │
│  If you can only invest ₹ [ 8,000 ] /month:                               │
│  → You need 15.6% CAGR   (only 18% of historical periods delivered this) │
│                                                                           │
│  [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░] 18% hit rate           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Implementation Plan

**Frontend (`frontend/`):**

1. Add `requiredMonthlySIP`, `computeReverseSipScenarios`, `sipSensitivity` to `frontend/src/utils/sipUtils.js`
2. Create `frontend/src/components/charts/cards/ReverseSipCard.jsx`
3. Register in `frontend/src/components/charts/cards/index.js`
4. Add tab `'reverse-sip'` to `RollingReturnChart.jsx` tab list
5. Route tab to `<ReverseSipCard data={data} activeWindow={activeWindow} />`

**Terminal UI (`terminal-ui/`):**

1. Mirror `requiredMonthlySIP`, `computeReverseSipScenarios`, `sipSensitivity` in `terminal-ui/src/shared/utils/chartUtils.js`
2. Add `ReverseSipSection` component inside `TerminalChart.jsx`
3. Add `{ id: 'reverse-sip', label: 'REV SIP' }` to `SECTIONS` array
4. Route in the `activeSection` switch block

---

## Feature 9: Retirement Corpus Simulator [Focus]

### Problem Statement

The SIP Planner answers "how much will I accumulate?" The Retirement Corpus Simulator answers the complete lifecycle question:

1. **Accumulation phase**: How long and how much SIP do I need to build a corpus large enough to retire on?
2. **Decumulation phase**: Once I retire, how long will my money last if I withdraw ₹X/month? Will it last 30 years?

The critical complication is **sequence-of-returns risk**: bad returns early in retirement are much more damaging than bad returns late, because you are selling units at low prices to fund withdrawals. A Monte Carlo simulation using the fund's own historical return distribution captures this — it's far more honest than the standard "assume 12% flat" approach.

---

### User Inputs

#### Accumulation Phase
| Input | Default | Range | Description |
|---|---|---|---|
| Monthly SIP (₹) | 20,000 | Any positive | What you invest each month today |
| Years to Retire | 25 | 1–40 | Working years remaining |
| Current corpus (₹) | 0 | 0+ | Existing savings to include |

#### Decumulation Phase
| Input | Default | Range | Description |
|---|---|---|---|
| Monthly Withdrawal (₹) | 80,000 | Any positive | Post-retirement monthly spend |
| Retirement Duration (years) | 30 | 5–50 | How many years money must last |
| Inflation Rate (%) | 6.0 | 0–15 | Annual inflation for rising withdrawals |
| Post-Retirement Equity Allocation (%) | 30 | 0–100 | Portion staying in equity post-retirement |
| Debt Return Assumption (%) | 6.5 | 0–15 | Expected return on the debt portion |

#### Simulation
| Input | Default | Description |
|---|---|---|
| Monte Carlo Runs | 1,000 | Number of simulated retirement paths |
| Return window | 5Y | Which historical window to sample from |

---

### Outputs

**1. Projected Corpus at Retirement:**
```
P10: ₹ 1.8 Cr    P50: ₹ 3.2 Cr    P90: ₹ 5.6 Cr
```

**2. Retirement Viability Score:**
```
Out of 1,000 simulations:
  842 paths → money lasts full 30 years   (84.2% success rate)
  158 paths → corpus depleted before year 30
              Average depletion at year 22
```

**3. Safe Withdrawal Rate:**
```
At your P50 corpus (₹3.2 Cr):
  4.0% SWR → ₹10,667/month  (95% survival)
  5.0% SWR → ₹13,333/month  (78% survival)
  Your required: ₹80,000/month = 30% SWR → DANGER
```

**4. Corpus Depletion Fan Chart** — visual showing the spread of 1,000 paths over 30 years, with the median, 10th and 90th percentile bands highlighted, and a red "danger zone" when paths hit zero.

**5. Shortfall Analysis** (if success rate < 80%):
- Additional SIP needed to hit 90% success
- Additional working years needed
- Required reduction in monthly withdrawal

---

### Mathematical Specification

#### Accumulation Phase

**Corpus after N years with existing savings `C0` and monthly SIP `P`:**
```
FV_sip   = P × [(1 + r_m)^n − 1] / r_m × (1 + r_m)
FV_lump  = C0 × (1 + r_a)^years
FV_total = FV_sip + FV_lump
```
Where `r_m = (1 + r_a)^(1/12) − 1`

**Percentile corpus:** compute `FV_total` for each percentile of the return distribution.

#### Decumulation Phase — Deterministic

**Corpus depletion with inflation-adjusted withdrawals:**
```
Each month t:
  W(t)  = W0 × (1 + inflation/12)^t     // inflation-adjusted withdrawal
  r(t)  = blended_monthly_return         // equity_alloc × equity_r + debt_alloc × debt_r
  C(t)  = C(t−1) × (1 + r(t)) − W(t)
  if C(t) <= 0: depletion at month t
```

**Blended monthly return:**
```
equity_r_monthly = (1 + equity_annual / 100)^(1/12) − 1
debt_r_monthly   = (1 + debt_annual   / 100)^(1/12) − 1
blended          = equity_alloc/100 × equity_r + (1 − equity_alloc/100) × debt_r
```

#### Decumulation Phase — Monte Carlo

```
For each simulation run i = 1..N:
  Sample equity returns by bootstrapping from historical distribution:
    each month: draw a random return from returnDistPct (with replacement)
  Compute blended return using sampled equity + deterministic debt
  Run depletion loop above
  Record: did corpus survive all 30 years? If not, at which year did it deplete?

success_rate = count(survived) / N × 100
```

**Bootstrap sampling is critical** — it preserves the empirical return distribution including fat tails and low-probability extreme events, without assuming normality.

#### Safe Withdrawal Rate

```
For a given corpus C and duration D (months):
  Binary search on W: find max W such that success_rate(W, C, D) >= 90%
  SWR_annual = (W × 12) / C × 100
```

---

### New Utility Functions (`sipUtils.js`)

```js
/**
 * Accumulation: compute corpus at retirement across percentiles.
 * Factors in existing savings (lump sum) + ongoing SIP.
 *
 * @param {number[]} returnDistPct  - Historical CAGR distribution in %
 * @param {number}   monthlySIP     - Monthly investment in ₹
 * @param {number}   years          - Years until retirement
 * @param {number}   currentCorpus  - Existing savings in ₹
 * @returns {Object}                - { p10, p25, p50, p75, p90 } in ₹
 */
export function computeRetirementCorpus(returnDistPct, monthlySIP, years, currentCorpus = 0) {
  const sorted = [...returnDistPct].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)] / 100;
  const months = years * 12;

  const corpusAt = (r) => {
    const sipPart = sipFV(r, monthlySIP, months);
    const lumpPart = currentCorpus * Math.pow(1 + r, years);
    return Math.round(sipPart + lumpPart);
  };

  return { p10: corpusAt(pct(10)), p25: corpusAt(pct(25)), p50: corpusAt(pct(50)),
           p75: corpusAt(pct(75)), p90: corpusAt(pct(90)) };
}

/**
 * Decumulation: deterministic depletion path with inflation-adjusted withdrawals.
 * Returns monthly corpus values — useful for a single scenario curve.
 *
 * @param {number} startCorpus        - Starting corpus in ₹
 * @param {number} monthlyWithdrawal  - Initial monthly withdrawal in ₹
 * @param {number} retirementMonths   - Retirement duration in months
 * @param {number} annualEquityReturn - Equity annual return as % (e.g. 8.5)
 * @param {number} annualDebtReturn   - Debt annual return as % (e.g. 6.5)
 * @param {number} equityAllocPct     - Equity allocation as % (e.g. 30)
 * @param {number} annualInflation    - Annual inflation as % (e.g. 6)
 * @returns {{ months: number[], corpus: number[], depleted: boolean, depletionMonth: number|null }}
 */
export function runDeterministicDecumulation(
  startCorpus, monthlyWithdrawal, retirementMonths,
  annualEquityReturn, annualDebtReturn, equityAllocPct, annualInflation
) {
  const equityR  = Math.pow(1 + annualEquityReturn / 100, 1 / 12) - 1;
  const debtR    = Math.pow(1 + annualDebtReturn   / 100, 1 / 12) - 1;
  const blended  = (equityAllocPct / 100) * equityR + (1 - equityAllocPct / 100) * debtR;
  const inflR    = Math.pow(1 + annualInflation / 100, 1 / 12) - 1;

  const corpusPath = [startCorpus];
  let corpus = startCorpus;

  for (let t = 1; t <= retirementMonths; t++) {
    const withdrawal = monthlyWithdrawal * Math.pow(1 + inflR, t - 1);
    corpus = corpus * (1 + blended) - withdrawal;
    if (corpus <= 0) {
      return { corpus: corpusPath, depleted: true, depletionMonth: t };
    }
    corpusPath.push(Math.round(corpus));
  }
  return { corpus: corpusPath, depleted: false, depletionMonth: null };
}

/**
 * Decumulation: Monte Carlo simulation using bootstrapped equity returns.
 * Returns success rate and fan-chart data for visualization.
 *
 * @param {number[]} returnDistPct    - Historical equity CAGR distribution in %
 * @param {number}   startCorpus      - Starting corpus in ₹
 * @param {number}   monthlyWithdrawal
 * @param {number}   retirementYears
 * @param {number}   annualDebtReturn - % (e.g. 6.5)
 * @param {number}   equityAllocPct   - % (e.g. 30)
 * @param {number}   annualInflation  - % (e.g. 6)
 * @param {number}   runs             - Number of Monte Carlo paths (default 1000)
 * @returns {{ successRate: number, fanChart: Object[], depletionYears: number[] }}
 */
export function runRetirementMonteCarlo(
  returnDistPct, startCorpus, monthlyWithdrawal,
  retirementYears, annualDebtReturn, equityAllocPct, annualInflation, runs = 1000
) {
  const months = retirementYears * 12;
  const debtR  = Math.pow(1 + annualDebtReturn / 100, 1 / 12) - 1;
  const inflR  = Math.pow(1 + annualInflation  / 100, 1 / 12) - 1;
  const eq     = equityAllocPct / 100;

  // Convert distribution to monthly returns (bootstrap pool)
  // Annual CAGR → monthly: r_m = (1 + CAGR)^(1/12) − 1
  const monthlyPool = returnDistPct.map((r) => Math.pow(1 + r / 100, 1 / 12) - 1);

  const allPaths   = [];   // [run][year] corpus at year-end
  const depletionY = [];   // depletion year for failed runs

  for (let run = 0; run < runs; run++) {
    let corpus = startCorpus;
    const yearlyCorpus = [corpus];
    let depleted = false;

    for (let t = 1; t <= months; t++) {
      const equityR  = monthlyPool[Math.floor(Math.random() * monthlyPool.length)];
      const blended  = eq * equityR + (1 - eq) * debtR;
      const withdrawal = monthlyWithdrawal * Math.pow(1 + inflR, t - 1);
      corpus = corpus * (1 + blended) - withdrawal;

      if (corpus <= 0) {
        depletionY.push(Math.ceil(t / 12));
        depleted = true;
        // Pad remaining years with 0 for fan chart averaging
        while (yearlyCorpus.length <= retirementYears) yearlyCorpus.push(0);
        break;
      }
      if (t % 12 === 0) yearlyCorpus.push(Math.round(corpus));
    }
    if (!depleted) yearlyCorpus.push(Math.round(corpus)); // ensure length = retirementYears + 1
    allPaths.push(yearlyCorpus);
  }

  const successRate = ((runs - depletionY.length) / runs) * 100;

  // Build fan chart: for each year, compute percentile corpus across all runs
  const fanChart = Array.from({ length: retirementYears + 1 }, (_, y) => {
    const vals = allPaths.map((p) => p[y] ?? 0).sort((a, b) => a - b);
    const pct  = (p) => vals[Math.min(Math.floor((p / 100) * vals.length), vals.length - 1)];
    return { year: y, p10: pct(10), p25: pct(25), p50: pct(50), p75: pct(75), p90: pct(90) };
  });

  return { successRate, fanChart, depletionYears: depletionY };
}

/**
 * Find the Safe Withdrawal Rate for a given corpus and duration.
 * Binary searches for the max monthly withdrawal giving >= targetSuccessRate.
 *
 * @param {number[]} returnDistPct
 * @param {number}   startCorpus
 * @param {number}   retirementYears
 * @param {number}   annualDebtReturn
 * @param {number}   equityAllocPct
 * @param {number}   annualInflation
 * @param {number}   targetSuccessRate  - e.g. 90 for 90%
 * @param {number}   runs               - Monte Carlo runs per probe
 * @returns {{ safeMonthlyWithdrawal: number, swrPct: number }}
 */
export function findSafeWithdrawalRate(
  returnDistPct, startCorpus, retirementYears,
  annualDebtReturn, equityAllocPct, annualInflation,
  targetSuccessRate = 90, runs = 500
) {
  let lo = 0, hi = startCorpus; // monthly withdrawal search bounds
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const { successRate } = runRetirementMonteCarlo(
      returnDistPct, startCorpus, mid, retirementYears,
      annualDebtReturn, equityAllocPct, annualInflation, runs
    );
    if (successRate >= targetSuccessRate) lo = mid;
    else hi = mid;
  }
  const safeMonthly = Math.floor((lo + hi) / 2);
  return {
    safeMonthlyWithdrawal: safeMonthly,
    swrPct: +((safeMonthly * 12 / startCorpus) * 100).toFixed(2),
  };
}
```

---

### UI Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│  RETIREMENT CORPUS SIMULATOR                                             │
│  Accumulation → Decumulation lifecycle planner                           │
├────────────────────────────┬────────────────────────────────────────────┤
│  ACCUMULATION              │  DECUMULATION                              │
│  Monthly SIP [ ₹20,000 ]   │  Monthly withdrawal [ ₹80,000 ]            │
│  Years to retire [ 25   ]  │  Retirement duration [ 30 years ]          │
│  Current corpus [ ₹0    ]  │  Inflation [ 6 % ]                         │
│                            │  Equity allocation [ 30 % ]                │
│                            │  Debt return [ 6.5 % ]                     │
├────────────────────────────┴────────────────────────────────────────────┤
│  MC Runs [ 1000 ]   Return window [ 5Y ▾]   [ RUN SIMULATION ]          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ── CORPUS AT RETIREMENT (HDFC Flexi Cap · 25Y accumulation) ─────────  │
│  P10: ₹ 1.8 Cr   P25: ₹ 2.4 Cr   P50: ₹ 3.2 Cr   P90: ₹ 5.6 Cr        │
│                                                                          │
│  ── RETIREMENT VIABILITY (P50 corpus: ₹ 3.2 Cr · 1,000 MC paths) ────  │
│                                                                          │
│  ╔════════════════════════════════════════════╗                          │
│  ║  SUCCESS RATE: 84.2%                       ║                          │
│  ║  842 / 1000 paths survived 30 years        ║                          │
│  ║  158 paths depleted (avg at year 22)       ║                          │
│  ╚════════════════════════════════════════════╝                          │
│                                                                          │
│  [Fan chart: 30-year corpus paths — P10/P50/P90 bands + danger zone]    │
│                                                                          │
│  ── SAFE WITHDRAWAL RATE ──────────────────────────────────────────────  │
│  At 90% confidence, your P50 corpus supports: ₹ 10,667 / month          │
│  (4.0% SWR annual)                                                       │
│                                                                          │
│  Your target ₹80,000/month = 30% SWR  ⚠ Significantly above safe rate  │
│                                                                          │
│  ── WHAT NEEDS TO CHANGE? ─────────────────────────────────────────────  │
│  To reach 90% success at ₹80,000/month withdrawal:                      │
│  → Increase SIP to ₹ 47,000/month  (+₹27,000)          OR               │
│  → Work 6 more years  (retire at 56 instead of 50)      OR              │
│  → Reduce withdrawal to ₹ 34,000/month  (−57%)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Implementation Plan

#### Phase 1 — Core utilities

1. Add to `frontend/src/utils/sipUtils.js`:
   - `computeRetirementCorpus()`
   - `runDeterministicDecumulation()`
   - `runRetirementMonteCarlo()`
   - `findSafeWithdrawalRate()`

2. Mirror in `terminal-ui/src/shared/utils/chartUtils.js`

#### Phase 2 — Main frontend card

3. Create `frontend/src/components/charts/cards/RetirementCard.jsx`
   - Sub-components: `AccumulationInputs`, `DecumulationInputs`, `CorpusProjection`, `MonteCarloResults`, `FanChart`, `ShortfallAnalysis`
   - Uses `useMemo` to memoize MC run (heavy computation)
   - Debounce inputs by 500ms before re-running simulation

4. Register in `frontend/src/components/charts/cards/index.js`

5. Add tab `'retirement'` to tab list in `RollingReturnChart.jsx`

#### Phase 3 — Terminal UI section

6. Add `RetirementSection` to `TerminalChart.jsx`
   - Keep the same monolithic style, consistent with existing sections
   - Two-panel layout: inputs left, results right (or stacked on narrow screens)
   - `{ id: 'retirement', label: 'RETIRE' }` in `SECTIONS`

#### Phase 4 — Performance

7. `runRetirementMonteCarlo` with 1,000 runs × 360 months = 360,000 iterations.
   - Runs in < 100ms in a tight JS loop — no Web Worker needed
   - Use `useMemo` with dependency array `[returnDistPct, startCorpus, monthlyWithdrawal, retirementYears, debtReturn, equityAlloc, inflation, runs]`
   - `findSafeWithdrawalRate` calls MC 20× — use `runs=500` inside to keep < 1s total

---

## Other Features — Brief Specs

### Feature 1: Category Peers Comparison

**What:** Auto-detect SEBI category from `scheme_name` (e.g., "Flexi Cap", "Large & Mid Cap"), fetch peer funds in the same category, show percentile rank for each KPI.

**New backend endpoint:** `GET /api/peers?category=Flexi+Cap&window=3y`
Returns: list of scheme codes in same category with their rolling return stats.

**New frontend component:** `PeerRankCard.jsx` — bar chart showing fund's return vs. category P25/P50/P75.

---

### Feature 5: Underwater Chart

**What:** Time spent below the previous all-time-high NAV (as a percentage). Complements drawdown stats by answering "how long was the investor underwater?"

**Computation:**
```js
// For each date t:
//   underwater[t] = (NAV[t] / runningPeak[t]) - 1  (always <= 0)
// runningPeak[t] = max(NAV[0..t])
```

**New component:** Thin area chart below zero using `fill="#ef4444"`. Add as a panel below the existing drawdown chart.

---

### Feature 6: Return Heatmap by Entry Date

**What:** Matrix where rows = entry year, columns = holding period (1Y / 3Y / 5Y / 10Y), cell = CAGR achieved. Color from red (negative) to green (>15%).

**Computation:** Already have rolling return data from backend. Pivot by entry date.

**New component:** `EntryDateHeatmapCard.jsx` — uses CSS grid with `background: interpolate(red, yellow, green)`. No additional charting library needed.

---

### Feature 7: Lumpsum vs SIP Comparison

**What:** For a given date range, show side-by-side: lumpsum at period start vs. monthly SIP over same period. Answer: which strategy won, and why (helps investors understand rupee-cost averaging).

**Computation:**
- Lumpsum CAGR: `(FinalNAV / InitialNAV)^(1/years) - 1`
- SIP XIRR: existing `sipXirr()` or binary-search approach

---

### Feature 10: NFO Warning

**What:** If a selected fund has < 3 years of NAV data, show a prominent warning banner: "This fund has only N months of data. Rolling return analysis requires at least 36 months. Displayed statistics may be unreliable."

**Implementation:** One check in `RollingReturnChart.jsx` before rendering cards. Trivial — `data.funds[0].windows.find(w => w.window === '3y')?.data?.length < 5` triggers the banner.

---

### Feature 11: Tax Harvesting Helper

**What:** Given a user's purchase date and amount, compute:
- Current LTCG/STCG status
- Estimated tax on full redemption today
- Optimal exit window (just after 1-year mark for LTCG vs. STCG arbitrage)

**Tax rules (India, FY 2024-25):**
- Equity STCG (< 1Y): 20% flat
- Equity LTCG (≥ 1Y): 12.5% on gains above ₹1.25 lakh
- Debt (post Apr 2023): slab rate on full gain, no LTCG benefit

**New component:** `TaxHelperCard.jsx` — inputs: purchase date, purchase amount, tax bracket. Outputs: after-tax proceeds vs. holding period curve.

---

*Last updated: based on conversation context*
