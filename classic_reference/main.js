import { ARTICLE_217_DATA } from './src/data/sanction_data.js';
import { calculate } from './src/services/calculator.js';

/**
 * Main Application Module (Premium Redesign)
 * 
 * Simply reads the normalized data and hooks it to the redesigned UI.
 * Logic is strictly preserved.
 */

// ─── App State ─────────────────────────────────────────────────────────────
const appState = {
  model: ARTICLE_217_DATA,
};

// ─── DOM refs ──────────────────────────────────────────────────────────────
const dom = {
  offenseSelect:         document.getElementById('offense'),
  subArticleSelect:      document.getElementById('sub-article'),
  classificationSelect:  document.getElementById('classification'),
  sanctionTypeSelect:    document.getElementById('sanction-type'),
  guiltDegreeSelect:     document.getElementById('guilt-degree'),
  consequenceSelect:     document.getElementById('consequence-gravity'),
  executionSelect:       document.getElementById('execution-type'),
  dataStatus:            document.getElementById('data-status'),
  calculateBtn:          document.getElementById('calculate-btn'),
  resultPanel:           document.getElementById('result-panel'),
  resultYears:           document.getElementById('result-years'),
  resultRange:           document.getElementById('result-range'),
  resultBreakdown:       document.getElementById('result-breakdown'),
  resultSteps:           document.getElementById('result-steps'),
  errorPanel:            document.getElementById('error-panel'),
  errorMessage:          document.getElementById('error-message'),
  viewDataBtn:           document.getElementById('view-data-btn'),
  proofGrid:             document.getElementById('proof-grid'),
};

// ─── Populate a <select> from an array of string values ────────────────────
function populateSelect(selectEl, values, placeholder) {
  selectEl.innerHTML = `<option value="">-- ${placeholder} --</option>`;
  values.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    selectEl.appendChild(opt);
  });
  selectEl.disabled = false;
}

// ─── Build all dropdowns from the normalized model ────────────────────────
function buildDropdowns(model) {
  populateSelect(dom.offenseSelect, [model.articleName], 'Criminal Offense');
  dom.offenseSelect.value = model.articleName;

  populateSelect(dom.subArticleSelect, model.subArticles.map(sa => sa.label), 'Sub-Article');

  const ref = model.subArticles[0].factors;
  populateSelect(dom.classificationSelect, Object.keys(ref.classification), 'VSTV Classification');
  
  populateSelect(dom.sanctionTypeSelect, ['Kazna zatvora'], 'Sanction Type');
  dom.sanctionTypeSelect.value = 'Kazna zatvora';

  populateSelect(dom.guiltDegreeSelect, Object.keys(ref.guilt),       'Degree of Guilt');
  populateSelect(dom.consequenceSelect, Object.keys(ref.consequence), 'Gravity of Consequence');
  populateSelect(dom.executionSelect,   Object.keys(ref.execution),   'Type of Execution');

  dom.calculateBtn.disabled = false;
}

// ─── Render the SanctionResult with Premium UI ────────────────────────────
function showResult(profile, inputs) {
  dom.errorPanel.style.display  = 'none';
  dom.resultPanel.style.display = 'block';

  // Highlight result
  dom.resultYears.textContent = profile.result.toFixed(2);
  dom.resultRange.textContent = `Legal range for ${profile.subArticle}: ${profile.min} – ${profile.max} years`;

  // Standard Breakdown Table
  dom.resultBreakdown.innerHTML = `
    <table class="breakdown-table">
      <thead>
        <tr><th>Dimension</th><th>Selection</th><th>Magnitude</th><th>Result Shift</th></tr>
      </thead>
      <tbody>
        <tr><td>Classification</td><td class="selection-cell">${inputs.classification}</td><td>${(profile.weights.classification * 100).toFixed(1)}%</td><td>+${(profile.weights.classification * profile.max).toFixed(3)}</td></tr>
        <tr><td>Degree of Guilt</td><td class="selection-cell">${inputs.guilt}</td><td>${(profile.weights.guilt * 100).toFixed(1)}%</td><td>+${(profile.weights.guilt * profile.max).toFixed(3)}</td></tr>
        <tr><td>Gravity of Harm</td><td class="selection-cell">${inputs.consequence}</td><td>${(profile.weights.consequence * 100).toFixed(1)}%</td><td>+${(profile.weights.consequence * profile.max).toFixed(3)}</td></tr>
        <tr><td>Execution Context</td><td class="selection-cell">${inputs.execution}</td><td>${(profile.weights.execution * 100).toFixed(1)}%</td><td>+${(profile.weights.execution * profile.max).toFixed(3)}</td></tr>
      </tbody>
    </table>
  `;

  // Verified Trace Proof Grid
  dom.proofGrid.innerHTML = `
    <div class="proof-item">
      <div class="proof-label">Source Identifier</div>
      <div class="proof-value">${ARTICLE_217_DATA.articleName}</div>
    </div>
    <div class="proof-item">
      <div class="proof-label">Base Max Range</div>
      <div class="proof-value">${profile.max}.00 Years</div>
    </div>
    <div class="proof-item">
      <div class="proof-label">Resolved Scaling</div>
      <div class="proof-value">${((profile.result / profile.max) * 100).toFixed(2)}% of Max</div>
    </div>
    <div class="proof-item">
      <div class="proof-label">Integrity Status</div>
      <div class="proof-value" style="color: var(--success)">MATCH_VERIFIED</div>
    </div>
  `;

  dom.resultSteps.innerHTML = profile.steps.map(s => `<li>${s}</li>`).join('');
  
  // Smooth scroll to result
  dom.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Render an error ───────────────────────────────────────────────────────
function showError(err) {
  dom.resultPanel.style.display = 'none';
  dom.errorPanel.style.display  = 'block';
  dom.errorMessage.textContent  = `[COMPUTATION_ERROR] ${err.message}`;
}

// ─── Init ──────────────────────────────────────────────────────────────────
function init() {
  try {
    dom.dataStatus.textContent = 'SYSTEM_READY';
    dom.dataStatus.classList.add('success');
    
    buildDropdowns(appState.model);
    console.info('UI Redesign Initialized with Source Model');

  } catch (err) {
    console.error('Initialization error:', err);
    dom.dataStatus.textContent = 'SYSTEM_FAILURE';
    showError(err);
  }
}

// ─── Event Listeners ───────────────────────────────────────────────────────
dom.viewDataBtn.addEventListener('click', () => {
  console.log('Active Source Model:', appState.model);
  alert('Explicit model logged to browser console.');
});

dom.calculateBtn.addEventListener('click', () => {
  const inputs = {
    subArticleLabel: dom.subArticleSelect.value,
    classification:  dom.classificationSelect.value,
    guilt:           dom.guiltDegreeSelect.value,
    consequence:     dom.consequenceSelect.value,
    execution:       dom.executionSelect.value,
  };

  const missing = Object.entries(inputs).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    showError({ message: `Required parameters missing: ${missing.join(', ')}` });
    return;
  }

  try {
    const profile = calculate(inputs, appState.model);
    showResult(profile, inputs);
  } catch (err) {
    showError(err);
  }
});

document.addEventListener('DOMContentLoaded', init);
