# Sanctions Calculator — Implementation Walkthrough

## What Was Built

### New Files

| File | Purpose |
|------|---------|
| `src/domain/exceptions.js` | `MissingFactorException`, `ArticleNotFoundException` — loud failure, no silent fallbacks |
| `src/domain/models.js` | JSDoc typedefs: `CrimeArticle`, `SubArticle`, `BaseRange`, `FactorMatrix`, `SanctionProfile` |
| `src/services/parser.js` | Anchor-based CSV parser: finds `"Stav 1"`/`"Stav 2"` dynamically, exact key canonical maps, throws on missing data |
| `src/services/calculator.js` | Decoupled `CalculationEngine.calculate()`: `result = Σ(weight_i × baseRange.max)`, step-by-step audit trail, returns frozen `SanctionProfile` |
| `src/services/calculator.test.js` | Vitest tests: Scenarios A + B, proof of output difference, failure mode guard |

### Modified Files
- `main.js` — uses `parseCrimeArticle()` and `calculate()`, builds dropdowns from domain model, renders `SanctionProfile`
- `index.html` — added classification, sub-article, execution selects; result panel with breakdown table and audit trail
- `style.css` — result card, error card, breakdown table, steps list
- `package.json` — added `"test": "vitest run"`

---

## Calculation Formula

Derived from the known expected output of 2.6 in the Percent CSV:

```
result = Σ( weight_i × baseRange.max )
```

Each factor dimension contributes independently. Weights are stored as decimal fractions (7.0% → 0.07).

---

## Automated Test Results

```
✓ CalculationEngine — Scenario A (1)
  ✓ produces 2.6 for Stav 1/Osnovni/Direktni umišljaj/Povreda/Osnovni
✓ CalculationEngine — Scenario B (1)
  ✓ produces 1.2 for Stav 2/Visoki/Svjesni nehat/Izuzetno/Osnovni
✓ CalculationEngine — Proof of output difference (1)
  ✓ Scenario A result (2.6) differs from Scenario B result (1.2)
✓ CalculationEngine — Failure mode (1)
  ✓ throws MissingFactorException for an unknown guilt value

Test Files  1 passed (1)
     Tests  4 passed (4)
```

**[Proof]** Scenario A result: 2.6 | Scenario B result: 1.2 | Difference: 1.4

---

## Scenario A — Resolved Internal Values

| Input | Canonical Key | Weight | Contribution (×max=10) |
|-------|-------------|--------|----------------------|
| Osnovni (classification) | `Osnovni` | 7.0% | **0.700 yrs** |
| Direktni umišljaj (guilt) | `Direktni umišljaj` | 7.0% | **0.700 yrs** |
| Povreda (consequence) | `Povreda` | 7.0% | **0.700 yrs** |
| Osnovni (execution) | `Osnovni` | 5.0% | **0.500 yrs** |
| **TOTAL** | | | **2.600 yrs** ✓ |

## Scenario B — Resolved Internal Values

| Input | Canonical Key | Weight | Contribution (×max=5) |
|-------|-------------|--------|----------------------|
| Visoki (classification) | `Visoki` | 7.0% | **0.350 yrs** |
| Svjesni nehat (guilt) | `Svjesni nehat` | 7.0% | **0.350 yrs** |
| Izuzetno (consequence) | `Izuzetno` | 5.0% | **0.250 yrs** |
| Osnovni (execution) | `Osnovni` | 5.0% | **0.250 yrs** |
| **TOTAL** | | | **1.200 yrs** |

---

## Browser Verification

![Sanctions Calculator verification recording](file:///home/zenmasterlex/.gemini/antigravity/brain/66c70b77-1bbb-44c2-bc4e-8f740bf76890/sanctions_calculator_verify_1773068650330.webp)

- Data status badge: **LOADED**
- Scenario A result displayed: **2.60 years** (range 1–10)
- Scenario B result displayed: **1.20 years** (range 0.5–5)
- No errors on page or in console
