/**
 * Domain Models for the Sanctions Calculator.
 * These are plain data structures — no logic, no defaults, no silent fallbacks.
 */

/**
 * The allowable range of a base sanction for a specific sub-article.
 * @typedef {{ min: number, max: number }} BaseRange
 */

/**
 * One dimension of the factor matrix (e.g. guilt, consequence, execution).
 * Maps a canonical key name to a numeric weight.
 * @typedef {{ [key: string]: number }} FactorDimension
 */

/**
 * The complete weight matrix for a sub-article. Each property is a named
 * FactorDimension whose weights are drawn directly from the CSV.
 *
 * @typedef {{
 *   classification: FactorDimension,
 *   guilt:          FactorDimension,
 *   consequence:    FactorDimension,
 *   execution:      FactorDimension,
 *   baseMultiplier: number
 * }} FactorMatrix
 */

/**
 * A sub-article block (e.g. "Stav 1", "Stav 2").
 *
 * @typedef {{
 *   label:         string,
 *   baseRange:     BaseRange,
 *   factorMatrix:  FactorMatrix
 * }} SubArticle
 */

/**
 * A parsed crime article, containing one or more sub-articles.
 *
 * @typedef {{
 *   name:         string,
 *   subArticles:  SubArticle[]
 * }} CrimeArticle
 */

/**
 * The fully resolved result of a single calculation.
 * Immutable snapshot of every value that contributed to the result.
 *
 * @typedef {{
 *   article:              string,
 *   subArticle:           string,
 *   classification:       string,
 *   guilt:                string,
 *   consequence:          string,
 *   execution:            string,
 *   baseMin:              number,
 *   baseMax:              number,
 *   classificationWeight: number,
 *   guiltWeight:          number,
 *   consequenceWeight:    number,
 *   executionWeight:      number,
 *   baseMultiplier:       number,
 *   steps:                string[],
 *   result:               number
 * }} SanctionProfile
 */
