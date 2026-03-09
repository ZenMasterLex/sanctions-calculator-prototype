/**
 * Calculation Engine (Refactored)
 * 
 * Strictly consumes the NormalizedSanctionModel.
 * Provides a traceable, deterministic result.
 */

import { ArticleNotFoundException, MissingFactorException } from '../domain/exceptions.js';

/**
 * Calculate the sanction based on normalized model.
 * 
 * @param {Object} inputs 
 * @param {import('./normalizer.js').NormalizedSanctionModel} model 
 * @returns {Object} Result with audit trail
 */
export function calculate(inputs, model) {
  if (!model || !model.subArticles) {
    throw new ArticleNotFoundException('CalculationEngine: Invalid model');
  }

  const subArticle = model.subArticles.find(sa => sa.label === inputs.subArticleLabel);
  if (!subArticle) {
    throw new ArticleNotFoundException(`Subarticle not found: ${inputs.subArticleLabel}`);
  }

  const { min, max, factors } = subArticle;
  const steps = [];

  steps.push(`[DEBUG] Subarticle: ${subArticle.label}`);
  steps.push(`[DEBUG] Base Range: [${min}, ${max}]`);

  const getWeight = (dim, key) => {
    const val = factors[dim][key];
    if (val === undefined) {
      throw new MissingFactorException(`Weight missing for ${dim}.${key}`);
    }
    return val;
  };

  const wClass = getWeight('classification', inputs.classification);
  const wGuilt = getWeight('guilt',          inputs.guilt);
  const wCons  = getWeight('consequence',     inputs.consequence);
  const wExec  = getWeight('execution',       inputs.execution);

  steps.push(`[DEBUG] Weights: class=${wClass}, guilt=${wGuilt}, cons=${wCons}, exec=${wExec}`);

  const contribClass = wClass * max;
  const contribGuilt = wGuilt * max;
  const contribCons  = wCons * max;
  const contribExec  = wExec * max;

  steps.push(`[DEBUG] Contributions: class=${contribClass.toFixed(3)}, guilt=${contribGuilt.toFixed(3)}, cons=${contribCons.toFixed(3)}, exec=${contribExec.toFixed(3)}`);

  let result = contribClass + contribGuilt + contribCons + contribExec;
  
  // Clamp
  const clamped = Math.min(Math.max(result, min), max);
  if (clamped !== result) {
    steps.push(`[DEBUG] Clamped from ${result.toFixed(4)} to ${clamped.toFixed(4)}`);
    result = clamped;
  }

  return {
    result: Number(result.toFixed(4)),
    subArticle: subArticle.label,
    min,
    max,
    weights: {
      classification: wClass,
      guilt: wGuilt,
      consequence: wCons,
      execution: wExec
    },
    steps
  };
}
