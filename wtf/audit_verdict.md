# Audit Verdict — Sanctions Calculator V2

**Auditor role. Prosecutor rules applied.**

---

## Test Run (Live Proof)

```
✓ CalculationEngine — Scenario A
  ✓ produces 2.6 for Stav 1/Osnovni/Direktni umišljaj/Povreda/Osnovni
✓ CalculationEngine — Scenario B
  ✓ produces 1.2 for Stav 2/Visoki/Svjesni nehat/Izuzetno/Osnovni
✓ Proof of output difference: 2.6 ≠ 1.2 (Δ = 1.4)
✓ Failure mode: throws MissingFactorException for unknown guilt

Tests 4 passed (4)
```

All tests pass. This is the starting point, not the conclusion.

---

## Q1 — Do different valid selections resolve to different internal values?

**Answer: Yes, conditionally.**

`calculator.js :: calculate()` calls `canonicalize()` (line 84–93) for each input dimension, then `getWeight()` (line 103–111) against the parsed `FactorMatrix`. Both functions throw `MissingFactorException` on any unknown input — no silent fallback, no default weight.

**Concrete resolved values confirmed by tests:**

| Scenario | SubArticle | Classification | Guilt | Consequence | Execution | Result |
|----------|-----------|---------------|-------|-------------|-----------|--------|
| A | Stav 1 (max=10) | Osnovni → 0.07 | Direktni umišljaj → 0.07 | Povreda → 0.07 | Osnovni → 0.05 | **2.60 yrs** |
| B | Stav 2 (max=5) | Visoki → 0.07 | Svjesni nehat → 0.07 | Izuzetno → **0.05** | Osnovni → 0.05 | **1.20 yrs** |

The Scenarios differ on two axes — sub-article (which changes `baseRange.max` from 10→5) and consequence (which changes weight from 0.07→0.05 for `Izuzetno`). Both axes produce real numeric differences in the final result. ✓

**However:** In Stav 1's matrix, `classification: {Osnovni: 0.07, Srednji: 0.07, Visoki: 0.07}` — all three classification values carry identical weights. Similarly, all guilt values are 0.07, and all execution values are 0.05. Within Stav 1, swapping classification or guilt produces **no change in result**. This is faithful to the CSV data (the percent file truly has 7%/7%/7% for those columns), but it means a user switching between `Osnovni`, `Srednji`, and `Visoki` classification within Stav 1 gets identical results — which may feel like broken behavior even though the parser is correct.

This is a **data fidelity issue, not a code bug**. The CSV data itself assigns equal weights to those factors in this article.

---

## Q2 — Do they produce different final outputs for the right reason?

**Answer: Yes.**

The 1.4-year difference between Scenario A (2.6) and Scenario B (1.2) is fully explained by arithmetic, not UI magic:

```
A:  (0.07 + 0.07 + 0.07 + 0.05) × 10 = 0.26 × 10 = 2.60
B:  (0.07 + 0.07 + 0.05 + 0.05) × 5  = 0.24 × 5  = 1.20
```

Two real differences drive this:
1. **SubArticle**: `max=10` vs `max=5` — the base range is genuinely different.
2. **Consequence weight**: `Povreda=0.07` vs `Izuzetno=0.05` — a real weight difference parsed from the CSV.

The `steps[]` array inside `SanctionProfile` records every intermediate value. The audit trail is real, not cosmetic. ✓

---

## Q3 — Is there any silent fallback, hidden hardcoding, or fake-dynamic behavior?

**Two issues found.**

### Issue 1 — HARDCODED COLUMN ORDER (Medium severity)

`parser.js`, lines 74–96:

```js
const FACTOR_COLUMN_ORDER = [
  { dim: 'classification', key: 'Osnovni' },
  { dim: 'classification', key: 'Srednji' },
  ...  // 16 entries, fixed
];
```

The comment says "No hard-coded row/column indices for structural navigation." That claim holds for **row** navigation (anchors are dynamically found). But the **column assignment** of the 16 factor dimensions is fixed at design time. The parser dynamically finds the column where `"Min"` appears and uses that as `factorStartCol`, then iterates positionally: `col = factorStartCol + i`.

This is only correct if the factor columns in the CSV always appear in the same order relative to `Min`. For the current single CSV file this is true and verified. If a future CSV reorders columns, the parser will silently assign wrong weights to wrong keys with no error.

**This is hardcoding disguised as a dynamic offset calculation.** The "dynamic" part is only finding the start column; the column order itself is completely hardcoded.

> Mitigation present: the data has only one article and one CSV. For current scope, this does not break anything.

### Issue 2 — TEST FIXTURE BYPASSES REAL PARSER

`calculator.test.js`, line 30–102: The `ART217` test fixture is hand-written inline — it does **not** use `parseCrimeArticle()`. The automated tests only cover `calculate()` in isolation. The parser is never exercised against the actual CSV files in any automated test.

**Consequence:** If the real CSV changes or `parseCrimeArticle()` produces a different structure, the tests remain green while the browser application breaks. The walkthrough's claim that the implementation is "fully verified" is overstated. Parser correctness rests entirely on the browser verification screenshot, not automated tests.

### Issue 3 — CONSEQUENCE COLUMN OFF-BY-ONE (Minor)

`FACTOR_COLUMN_ORDER` lists 5 consequence values (Povreda, Ugrozavanje, Izuzetno, Srednje, Nisko) — but the `Consequence` dim in the percent CSV element row shows 4 entries before `Nisko`. Cross-checking: the CSV header row (Sheet1__.csv line 5) does confirm 5 consequence columns. This appears correctly handled, but there is no test that asserts the exact column count.

### No silent fallbacks in execution path

`canonicalize()` and `getWeight()` both hard-throw. `parseWeight()` throws on NaN. `MissingFactorException` is a proper named subclass of `Error`. Error display in the UI calls `showError()` with `[err.name] ${err.message}` — visible to user. No silent catch-and-continue patterns found. ✓

---

## Q4 — Does the code match the walkthrough's claimed scenarios?

**Answer: Yes for the calculation scenarios. Partial for the parser claim.**

| Walkthrough Claim | Code Reality | Match? |
|-------------------|-------------|--------|
| Scenario A → 2.6 yrs | `calculate()` with hardcoded fixture produces 2.6 | ✓ |
| Scenario B → 1.2 yrs | `calculate()` with hardcoded fixture produces 1.2 | ✓ |
| "Anchor-based parser, no hard-coded indices" | Row anchors dynamic; column order hardcoded | Partial |
| "MissingFactorException on missing data" | Correct — verified by test | ✓ |
| "result = Σ(weight_i × baseRange.max)" | Matches code lines 178–188 exactly | ✓ |
| "SanctionProfile is frozen" | `Object.freeze()` at line 201 | ✓ |
| "4 tests pass" | Confirmed by live run | ✓ |

---

## Verdict

> **ACCEPT WITH CAVEATS**

The core logic is correct, traceable, and not faked. The two scenarios produce different outputs for real, arithmetic reasons. There are no silent fallbacks in the execution path. The walkthrough numbers match the code.

**The following must be acknowledged before full acceptance:**

1. **Column order is hardcoded** — The parser's dynamic anchor-finding does not extend to the factor column assignment. This is documented as a limitation but not flagged in the walkthrough. It will silently produce wrong weights if any future CSV reorders factor columns.

2. **Parser has no automated test coverage** — The test suite only covers `calculator.js` with a hand-built fixture. `parseCrimeArticle()` is untested in CI. If the real parser produces wrong weights, all four tests still pass.

3. **Within-dimension weight uniformity** — For this article, all classification values and all guilt values carry identical weights. Users selecting different values within those dimensions get identical results. This is data-faithful but should be documented — it could be mistaken for broken behavior.

These are not blocking defects for the current single-article scope. They are scope constraints that become defects if the system expands to more articles or different CSV layouts.
