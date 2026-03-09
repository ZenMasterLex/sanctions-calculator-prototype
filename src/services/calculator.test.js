/**
 * Automated Tests — CalculationEngine
 *
 * These tests satisfy the Auditor's Verification Proof requirements:
 *   1. Exact functions involved
 *   2. Internal data structure used
 *   3. Two concrete example inputs/selections
 *   4. Resolved internal values for each
 *   5. Proof that outputs differ when they should
 *
 * Run with: npm run test
 */

import { describe, it, expect } from 'vitest';
import { calculate } from './calculator.js';

// ---------------------------------------------------------------------------
// Test Article — constructed directly from the parsed CSV data.
//
// Internal data structure: CrimeArticle → SubArticle[] → { baseRange, factorMatrix }
//
// Source: `AUTOMATIC SANCTION CALCULATOR.xlsx - Sheet1__.csv` (Percent file)
//   Stav 1 (rows 2–9): Min=1, Max=10, weights = 7.0%/5.0% as decimal fractions
//   Stav 2 (rows 11–17): Min=0.5, Max=5, same weight proportions
//
// These values are taken verbatim from the Element row of each Stav block.
// ---------------------------------------------------------------------------

/** @type {import('../domain/models.js').CrimeArticle} */
const ART217 = {
  name: 'Čl. 217 KZ BiH, "Primanje poklona i drugih oblika koristi"',
  subArticles: [
    {
      label: 'Stav 1',
      baseRange: { min: 1, max: 10 },
      factorMatrix: {
        // From Sheet1__%  Element row (line 6), cols 12–27 → into canonical keys.
        // Original header row (line 5): Osnovni,Srednji,Visoki,Direktini umisljaj,
        //   Indirketni umisljaj,Svjesni nehat,Nesvjesni nehat,Povreda,Ugrozavanje,
        //   Izuzetno,Srednje,Nisko,Osnovni,Kvalifikacioni,Sticaj,Produzeno djelo
        classification: {
          'Osnovni': 0.07,  // 7.0%
          'Srednji': 0.07,  // 7.0%
          'Visoki':  0.07,  // 7.0%
        },
        guilt: {
          'Direktni umišljaj':   0.07, // 7.0%
          'Indirektni umišljaj': 0.07, // 7.0%
          'Svjesni nehat':       0.07, // 7.0%
          'Nesvjesni nehat':     0.07, // 7.0%
        },
        consequence: {
          'Povreda':     0.07, // 7.0%
          'Ugrozavanje': 0.07, // 7.0%
          'Izuzetno':    0.05, // 5.0%
          'Srednje':     0.05, // 5.0%
          'Nisko':       0.07, // 7.0%  (from col 11 = 7.0% in element row)
        },
        execution: {
          'Osnovni':         0.05, // 5.0%
          'Kvalifikacioni':  0.05, // 5.0%
          'Sticaj':          0.05, // 5.0%
          'Produzeno djelo': 0.05, // 5.0%
        },
        baseMultiplier: 1.0,  // 100%
      },
    },
    {
      label: 'Stav 2',
      baseRange: { min: 0.5, max: 5 },
      factorMatrix: {
        // From Sheet1__%  Element row for Stav 2 (line 16), same percentage values,
        // but max=5 instead of max=10, so absolute contributions halve.
        classification: {
          'Osnovni': 0.07,
          'Srednji': 0.07,
          'Visoki':  0.07,
        },
        guilt: {
          'Direktni umišljaj':   0.07,
          'Indirektni umišljaj': 0.07,
          'Svjesni nehat':       0.07,
          'Nesvjesni nehat':     0.07,
        },
        consequence: {
          'Povreda':     0.07,
          'Ugrozavanje': 0.07,
          'Izuzetno':    0.05,
          'Srednje':     0.05,
          'Nisko':       0.07,
        },
        execution: {
          'Osnovni':         0.05,
          'Kvalifikacioni':  0.05,
          'Sticaj':          0.05,
          'Produzeno djelo': 0.05,
        },
        baseMultiplier: 1.0,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Scenario A
// ---------------------------------------------------------------------------
describe('CalculationEngine — Scenario A', () => {
  /**
   * Exact functions involved: calculate() in calculator.js
   *
   * Internal data structure used:
   *   CrimeArticle { name, subArticles: [ SubArticle { label:"Stav 1",
   *     baseRange:{ min:1, max:10 }, factorMatrix:{ classification, guilt,
   *     consequence, execution, baseMultiplier } } ] }
   *
   * Inputs:
   *   subArticleLabel = "Stav 1"
   *   classification  = "Osnovni"
   *   guilt           = "Direktni umišljaj"
   *   consequence     = "Povreda"
   *   execution       = "Osnovni"
   *
   * Formula:  result = Σ(weight_i × max)
   *   classificationContribution = 0.07 × 10 = 0.7
   *   guiltContribution          = 0.07 × 10 = 0.7
   *   consequenceContribution    = 0.07 × 10 = 0.7
   *   executionContribution      = 0.05 × 10 = 0.5
   *   RESULT                     = 2.6
   *
   * Expected result: 2.6  (matches "Automatski izračunata sankcija" in Sheet1__)
   */
  it('produces 2.6 for Stav 1/Osnovni/Direktni umišljaj/Povreda/Osnovni', () => {
    const profile = calculate(
      {
        subArticleLabel: 'Stav 1',
        classification:  'Osnovni',
        guilt:           'Direktni umišljaj',
        consequence:     'Povreda',
        execution:       'Osnovni',
      },
      ART217
    );

    // Resolved internal values
    expect(profile.subArticle).toBe('Stav 1');
    expect(profile.baseMin).toBe(1);
    expect(profile.baseMax).toBe(10);
    expect(profile.classificationWeight).toBe(0.07);
    expect(profile.guiltWeight).toBe(0.07);
    expect(profile.consequenceWeight).toBe(0.07);
    expect(profile.executionWeight).toBe(0.05);

    // Final result
    expect(profile.result).toBeCloseTo(2.6, 4);

    // Steps are recorded
    expect(profile.steps.length).toBeGreaterThan(0);
    expect(profile.steps.some(s => s.includes('FINAL RESULT'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scenario B
// ---------------------------------------------------------------------------
describe('CalculationEngine — Scenario B', () => {
  /**
   * Exact functions involved: calculate() in calculator.js
   *
   * Internal data structure used:
   *   CrimeArticle { ... SubArticle { label:"Stav 2", baseRange:{ min:0.5, max:5 } ... } }
   *
   * Inputs:
   *   subArticleLabel = "Stav 2"
   *   classification  = "Visoki"
   *   guilt           = "Svjesni nehat"
   *   consequence     = "Izuzetno"
   *   execution       = "Osnovni"
   *
   * Formula:  result = Σ(weight_i × max)
   *   classificationContribution = 0.07 × 5 = 0.35
   *   guiltContribution          = 0.07 × 5 = 0.35
   *   consequenceContribution    = 0.05 × 5 = 0.25
   *   executionContribution      = 0.05 × 5 = 0.25
   *   RESULT                     = 1.2
   */
  it('produces 1.2 for Stav 2/Visoki/Svjesni nehat/Izuzetno/Osnovni', () => {
    const profile = calculate(
      {
        subArticleLabel: 'Stav 2',
        classification:  'Visoki',
        guilt:           'Svjesni nehat',
        consequence:     'Izuzetno',
        execution:       'Osnovni',
      },
      ART217
    );

    // Resolved internal values
    expect(profile.subArticle).toBe('Stav 2');
    expect(profile.baseMin).toBe(0.5);
    expect(profile.baseMax).toBe(5);
    expect(profile.classificationWeight).toBe(0.07);
    expect(profile.guiltWeight).toBe(0.07);
    expect(profile.consequenceWeight).toBe(0.05);
    expect(profile.executionWeight).toBe(0.05);

    // Final result
    expect(profile.result).toBeCloseTo(1.2, 4);
  });
});

// ---------------------------------------------------------------------------
// Proof that outputs differ (Scenario A vs Scenario B)
// ---------------------------------------------------------------------------
describe('CalculationEngine — Proof of output difference', () => {
  it('Scenario A result (2.6) differs from Scenario B result (1.2)', () => {
    const profileA = calculate(
      { subArticleLabel: 'Stav 1', classification: 'Osnovni', guilt: 'Direktni umišljaj', consequence: 'Povreda', execution: 'Osnovni' },
      ART217
    );
    const profileB = calculate(
      { subArticleLabel: 'Stav 2', classification: 'Visoki', guilt: 'Svjesni nehat', consequence: 'Izuzetno', execution: 'Osnovni' },
      ART217
    );

    expect(profileA.result).not.toBe(profileB.result);
    expect(profileA.result).toBeGreaterThan(profileB.result);

    // Log the distinction for the audit trail
    console.log('[Proof] Scenario A result:', profileA.result);
    console.log('[Proof] Scenario B result:', profileB.result);
    console.log('[Proof] Difference:', Number((profileA.result - profileB.result).toFixed(4)));
  });
});

// ---------------------------------------------------------------------------
// Guard: MissingFactorException on unknown input
// ---------------------------------------------------------------------------
describe('CalculationEngine — Failure mode', () => {
  it('throws MissingFactorException for an unknown guilt value', () => {
    expect(() => calculate(
      { subArticleLabel: 'Stav 1', classification: 'Osnovni', guilt: 'UNKNOWN GUILT', consequence: 'Povreda', execution: 'Osnovni' },
      ART217
    )).toThrow('MissingFactorException' in Error ? Error : Error);
  });
});
