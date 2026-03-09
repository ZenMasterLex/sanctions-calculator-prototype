/**
 * Fixed File Normalizer
 * 
 * Rigidly parses the specific "Sanctions Calculator" CSV structure.
 * This is a prototype normalizer for two specific files, not a generic parser.
 */

import { MissingFactorException } from '../domain/exceptions.js';

/**
 * @typedef {Object} NormalizedSubArticle
 * @property {string} label
 * @property {number} min
 * @property {number} max
 * @property {Object} factors
 * @property {Record<string, number>} factors.classification
 * @property {Record<string, number>} factors.guilt
 * @property {Record<string, number>} factors.consequence
 * @property {Record<string, number>} factors.execution
 */

/**
 * @typedef {Object} NormalizedSanctionModel
 * @property {string} articleName
 * @property {NormalizedSubArticle[]} subArticles
 */

const FACTOR_ORDER = [
  { dim: 'classification', key: 'Osnovni' },
  { dim: 'classification', key: 'Srednji' },
  { dim: 'classification', key: 'Visoki' },
  { dim: 'guilt', key: 'Direktni umišljaj' },
  { dim: 'guilt', key: 'Indirektni umišljaj' },
  { dim: 'guilt', key: 'Svjesni nehat' },
  { dim: 'guilt', key: 'Nesvjesni nehat' },
  { dim: 'consequence', key: 'Povreda' },
  { dim: 'consequence', key: 'Ugrozavanje' },
  { dim: 'consequence', key: 'Izuzetno' },
  { dim: 'consequence', key: 'Srednje' },
  { dim: 'consequence', key: 'Nisko' },
  { dim: 'execution', key: 'Osnovni' },
  { dim: 'execution', key: 'Kvalifikacioni' },
  { dim: 'execution', key: 'Sticaj' },
  { dim: 'execution', key: 'Produzeno djelo' },
];

/**
 * Parse weight string (e.g., "7.0%", "0.5") into decimal fraction.
 * @param {string} raw 
 * @returns {number}
 */
function parseWeight(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 0;
  if (trimmed.endsWith('%')) {
    return parseFloat(trimmed.replace('%', '')) / 100;
  }
  return parseFloat(trimmed);
}

/**
 * Normalizes the specific Sheet1__.csv data.
 * 
 * @param {string[][]} rows 
 * @returns {NormalizedSanctionModel}
 */
export function normalizeProjectData(rows) {
  if (!rows || rows.length < 20) {
    throw new MissingFactorException('Normalizer: CSV data is too short or malformed');
  }

  const model = {
    articleName: 'Čl. 217 KZ BiH, "Primanje poklona i drugih oblika koristi"',
    subArticles: []
  };

  // --- Stav 1 Resolution ---
  // Min/Max at internal indices [2][12], [2][13] (Row 3, Col 13/14)
  // Weights at internal index [5] (Row 6) starting at col 12
  const stav1 = {
    label: 'Stav 1',
    min: parseFloat(rows[2][12]),
    max: parseFloat(rows[2][13]),
    factors: { classification: {}, guilt: {}, consequence: {}, execution: {} }
  };

  const weights1 = rows[5];
  FACTOR_ORDER.forEach((spec, i) => {
    stav1.factors[spec.dim][spec.key] = parseWeight(weights1[12 + i]);
  });
  model.subArticles.push(stav1);

  // --- Stav 2 Resolution ---
  // Min/Max at internal indices [12][12], [12][13] (Row 13, Col 13/14)
  // Weights at internal index [15] (Row 16) starting at col 12
  const stav2 = {
    label: 'Stav 2',
    min: parseFloat(rows[12][12]),
    max: parseFloat(rows[12][13]),
    factors: { classification: {}, guilt: {}, consequence: {}, execution: {} }
  };

  const weights2 = rows[15];
  FACTOR_ORDER.forEach((spec, i) => {
    stav2.factors[spec.dim][spec.key] = parseWeight(weights2[12 + i]);
  });
  model.subArticles.push(stav2);

  return model;
}
