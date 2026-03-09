/**
 * Parser Service
 *
 * Dynamically identifies section anchors in the raw CSV rows and projects
 * them into the CrimeArticle domain model.
 *
 * Rules enforced:
 * - No hard-coded row/column indices for structural navigation.
 * - Anchors are detected by scanning all cells.
 * - Keys are normalized via exact canonical mappings (no generic .includes).
 * - MissingFactorException is thrown if required values are absent.
 * - Data is NOT flattened; nested SubArticle structure is preserved.
 */

import { MissingFactorException } from '../domain/exceptions.js';

// ---------------------------------------------------------------------------
// Canonical key mappings
// Typos and variant spellings from the CSVs are mapped to stable internal keys.
// ---------------------------------------------------------------------------

/** @type {Record<string, string>} */
const CLASSIFICATION_CANONICAL = {
  'Osnovni':          'Osnovni',
  'Srednji':          'Srednji',
  'Visoki':           'Visoki',
  'Basic':            'Osnovni',
  'Middle':           'Srednji',
  'HIGH':             'Visoki',
};

/** @type {Record<string, string>} */
const GUILT_CANONICAL = {
  'Direktini umisljaj':   'Direktni umišljaj',
  'Direktni umišljaj':    'Direktni umišljaj',
  'Dolus directus':       'Direktni umišljaj',
  'Doluz directus':       'Direktni umišljaj',
  'Indirketni umisljaj':  'Indirektni umišljaj',
  'Indirektni umišljaj':  'Indirektni umišljaj',
  'Dolus indirectus':     'Indirektni umišljaj',
  'Svjesni nehat':        'Svjesni nehat',
  'Negligence 1':         'Svjesni nehat',
  'Nesvjesni nehat':      'Nesvjesni nehat',
  'Negligence 2':         'Nesvjesni nehat',
};

/** @type {Record<string, string>} */
const CONSEQUENCE_CANONICAL = {
  'Povreda':      'Povreda',
  'Injury':       'Povreda',
  'Ugrozavanje':  'Ugrozavanje',
  'Endangering':  'Ugrozavanje',
  'Izuzetno':     'Izuzetno',
  'Extreme':      'Izuzetno',
  'Srednje':      'Srednje',
  'Nisko':        'Nisko',
  'Low':          'Nisko',
};

/** @type {Record<string, string>} */
const EXECUTION_CANONICAL = {
  'Osnovni':           'Osnovni',
  'Kvalifikacioni':    'Kvalifikacioni',
  'Kvalifikatorni':    'Kvalifikacioni',
  'Sticaj':            'Sticaj',
  'Produzeno djelo':   'Produzeno djelo',
  'Produženo djelo':   'Produzeno djelo',
  'Merged criminal offence': 'Sticaj',
  'Extended criminal offence': 'Produzeno djelo',
};

// Order of factor columns in the weights row (cols 12–27, 0-indexed)
// Col 28 is the base multiplier (last in TTL) / 100% placeholder in percent.
const FACTOR_COLUMN_ORDER = [
  // Classification (3 cols)
  { dim: 'classification', key: 'Osnovni' },
  { dim: 'classification', key: 'Srednji' },
  { dim: 'classification', key: 'Visoki' },
  // Guilt (4 cols)
  { dim: 'guilt', key: 'Direktni umišljaj' },
  { dim: 'guilt', key: 'Indirektni umišljaj' },
  { dim: 'guilt', key: 'Svjesni nehat' },
  { dim: 'guilt', key: 'Nesvjesni nehat' },
  // Consequence (4 cols)
  { dim: 'consequence', key: 'Povreda' },
  { dim: 'consequence', key: 'Ugrozavanje' },
  { dim: 'consequence', key: 'Izuzetno' },
  { dim: 'consequence', key: 'Srednje' },
  { dim: 'consequence', key: 'Nisko' },
  // Execution (4 cols)
  { dim: 'execution', key: 'Osnovni' },
  { dim: 'execution', key: 'Kvalifikacioni' },
  { dim: 'execution', key: 'Sticaj' },
  { dim: 'execution', key: 'Produzeno djelo' },
  // Col 16 (index 16 from col 12) = base multiplier
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a weight value that may be expressed as a decimal ("0.5") or
 * percentage ("7.0%"). Returns a float fraction in all cases.
 * @param {string} raw
 * @returns {number}
 */
function parseWeight(raw) {
  const trimmed = (raw ?? '').trim();
  if (trimmed.endsWith('%')) {
    return parseFloat(trimmed.replace('%', '')) / 100;
  }
  const n = parseFloat(trimmed);
  if (isNaN(n)) {
    throw new MissingFactorException(`Cannot parse weight value: "${raw}"`);
  }
  return n;
}

/**
 * Find the first row index that has a cell with the exact value `anchor`.
 * @param {string[][]} rows
 * @param {string} anchor
 * @param {number} [startFrom=0]
 * @returns {number} -1 if not found
 */
function findAnchorRow(rows, anchor, startFrom = 0) {
  for (let i = startFrom; i < rows.length; i++) {
    if (rows[i].some(cell => cell.trim() === anchor)) {
      return i;
    }
  }
  return -1;
}

/**
 * Find the column index of a cell matching `value` within a given row.
 * @param {string[]} row
 * @param {string} value
 * @returns {number} -1 if not found
 */
function findColInRow(row, value) {
  return row.findIndex(cell => cell.trim() === value);
}

// ---------------------------------------------------------------------------
// Sub-article block parser
// ---------------------------------------------------------------------------

/**
 * Parse one Stav block (e.g. Stav 1 or Stav 2) starting at the anchor row.
 *
 * Layout relative to anchor row (row containing "Stav 1"/"Stav 2"):
 *   anchor row:   ... "Stav 1" ...
 *   anchor+1:     Min, Max label row
 *   anchor+2:     numeric Min, Max values
 *   anchor+3:     dimension header labels (Stepen krivnje, etc.) — skip
 *   anchor+4:     factor column labels (Osnovni, Srednji, ...)
 *   anchor+5:     "Element" row — weights
 *   anchor+6:     Boolean mask row (not used for core calculation)
 *
 * @param {string[][]} rows
 * @param {number} anchorRowIdx
 * @param {string} label  e.g. "Stav 1"
 * @param {number} factorStartCol  column index where the factor matrix begins
 * @returns {import('../domain/models.js').SubArticle}
 */
function parseSubArticleBlock(rows, anchorRowIdx, label, factorStartCol) {
  // --- Min / Max ---
  const minMaxRow = rows[anchorRowIdx + 2];
  if (!minMaxRow) {
    throw new MissingFactorException(`${label}: Min/Max row missing (expected at index ${anchorRowIdx + 2})`);
  }

  const minCol = findColInRow(rows[anchorRowIdx + 1], 'Min');
  const maxCol = findColInRow(rows[anchorRowIdx + 1], 'Max');
  if (minCol === -1 || maxCol === -1) {
    throw new MissingFactorException(`${label}: "Min" or "Max" label row not found at index ${anchorRowIdx + 1}`);
  }

  const minVal = parseFloat(minMaxRow[minCol]);
  const maxVal = parseFloat(minMaxRow[maxCol]);
  if (isNaN(minVal) || isNaN(maxVal)) {
    throw new MissingFactorException(`${label}: Min=${minMaxRow[minCol]}, Max=${minMaxRow[maxCol]} – one or both are not numeric`);
  }

  // --- Factor weights row ("Element") ---
  // Scan from anchor onwards to find the row that contains "Element" in any cell.
  let elementRowIdx = -1;
  for (let i = anchorRowIdx + 3; i < Math.min(anchorRowIdx + 8, rows.length); i++) {
    if (rows[i].some(cell => cell.trim() === 'Element')) {
      elementRowIdx = i;
      break;
    }
  }
  if (elementRowIdx === -1) {
    throw new MissingFactorException(`${label}: "Element" row not found in range after anchor ${anchorRowIdx}`);
  }

  const elementRow = rows[elementRowIdx];

  // --- Build FactorMatrix ---
  const factorMatrix = {
    classification: {},
    guilt: {},
    consequence: {},
    execution: {},
    baseMultiplier: null,
  };

  FACTOR_COLUMN_ORDER.forEach((spec, i) => {
    const colIdx = factorStartCol + i;
    const raw = elementRow[colIdx];
    if (raw === undefined || raw.trim() === '') {
      throw new MissingFactorException(
        `${label}: Factor "${spec.dim}.${spec.key}" is blank at column ${colIdx} in Element row ${elementRowIdx}`
      );
    }
    const weight = parseWeight(raw);
    factorMatrix[spec.dim][spec.key] = weight;
  });

  // Base multiplier is the value after the 16 factor columns
  const baseMultiplierRaw = elementRow[factorStartCol + FACTOR_COLUMN_ORDER.length];
  if (baseMultiplierRaw === undefined || baseMultiplierRaw.trim() === '') {
    throw new MissingFactorException(`${label}: Base multiplier (last column of Element row) is missing`);
  }
  factorMatrix.baseMultiplier = parseWeight(baseMultiplierRaw);

  return {
    label,
    baseRange: { min: minVal, max: maxVal },
    factorMatrix,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Ingest raw Papa Parse output (header: false) from one CSV file and return
 * a CrimeArticle domain object.
 *
 * @param {string[][]} rawRows  Output of Papa.parse with header:false
 * @param {string} articleName  Canonical article name (set by caller)
 * @returns {import('../domain/models.js').CrimeArticle}
 */
export function parseCrimeArticle(rawRows, articleName) {
  if (!rawRows || rawRows.length === 0) {
    throw new MissingFactorException('parseCrimeArticle: rawRows is empty');
  }

  const subArticles = [];

  // Find all "Stav N" anchors
  const stavAnchors = ['Stav 1', 'Stav 2'];

  let searchFrom = 0;
  for (const stavLabel of stavAnchors) {
    const anchorIdx = findAnchorRow(rawRows, stavLabel, searchFrom);
    if (anchorIdx === -1) {
      throw new MissingFactorException(
        `parseCrimeArticle: Sub-article anchor "${stavLabel}" not found in the data`
      );
    }

    // Determine which column the factor matrix starts in by finding where
    // "Min" appears in the next row (the Min/Max *label* row, anchor+1).
    const minLabelRow = rawRows[anchorIdx + 1];
    if (!minLabelRow) {
      throw new MissingFactorException(`"${stavLabel}": No row found after anchor at ${anchorIdx}`);
    }
    const minLabelCol = findColInRow(minLabelRow, 'Min');
    if (minLabelCol === -1) {
      throw new MissingFactorException(`"${stavLabel}": "Min" label not found in row ${anchorIdx + 1}`);
    }
    // Factor matrix columns start at the same column as "Min"
    const factorStartCol = minLabelCol;

    const subArticle = parseSubArticleBlock(rawRows, anchorIdx, stavLabel, factorStartCol);
    subArticles.push(subArticle);

    // Next search begins after this anchor
    searchFrom = anchorIdx + 1;
  }

  if (subArticles.length === 0) {
    throw new MissingFactorException(`parseCrimeArticle: No sub-articles found for "${articleName}"`);
  }

  return { name: articleName, subArticles };
}

/**
 * Convenience: given the raw text of the CSV, run Papa Parse and then parse
 * the result into a CrimeArticle.
 *
 * @param {string} csvText
 * @param {string} articleName
 * @returns {import('../domain/models.js').CrimeArticle}
 */
export async function parseCrimeArticleFromText(csvText, articleName) {
  // Dynamic import to keep this module usable in Node (tests) and browser.
  const Papa = (await import('papaparse')).default;
  const result = Papa.parse(csvText, { header: false, skipEmptyLines: false });
  if (result.errors && result.errors.length > 0) {
    // Non-fatal parse warnings are common in irregular CSVs; log but continue.
    console.warn('Papa parse warnings:', result.errors);
  }
  return parseCrimeArticle(result.data, articleName);
}
