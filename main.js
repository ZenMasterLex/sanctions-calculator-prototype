import { ARTICLE_217_DATA } from './src/data/sanction_data.js';
import { calculate } from './src/services/calculator.js';

/**
 * Main Application Module (Dual Mode)
 * 
 * Manages both Classic and Premium UIs from a single shared logic/runtime layer.
 * Toggles presentation via CSS Link switching. No logic changes.
 */

// ─── App State ─────────────────────────────────────────────────────────────
const appState = {
  model: ARTICLE_217_DATA,
  activeTheme: 'premium' // 'classic' or 'premium'
};

// ─── DOM refs (Dual Layer) ────────────────────────────────────────────────
const dom = {
  // Theme Toggle
  themeLinkPremium: document.getElementById('theme-premium'),
  themeLinkClassic: document.getElementById('theme-classic'),
  btnTogglePremium: document.getElementById('toggle-premium'),
  btnToggleClassic: document.getElementById('toggle-classic'),
  uiPremium: document.getElementById('ui-premium'),
  uiClassic: document.getElementById('ui-classic'),

  // Premium UI Refs
  premium: {
    offenseSelect:         document.getElementById('offense-premium'),
    subArticleSelect:      document.getElementById('sub-article-premium'),
    classificationSelect:  document.getElementById('classification-premium'),
    sanctionTypeSelect:    document.getElementById('sanction-type-premium'),
    guiltDegreeSelect:     document.getElementById('guilt-degree-premium'),
    consequenceSelect:     document.getElementById('consequence-gravity-premium'),
    executionSelect:       document.getElementById('execution-type-premium'),
    dataStatus:            document.getElementById('data-status-premium'),
    calculateBtn:          document.getElementById('calculate-btn-premium'),
    resultPanel:           document.getElementById('result-panel-premium'),
    resultNumber:          document.getElementById('result-number-premium'),
    resultRange:           document.getElementById('result-range-premium'),
    resultBreakdownBody:   document.getElementById('result-breakdown-body-premium'),
    resultSteps:           document.getElementById('result-steps-premium'),
    errorPanel:            document.getElementById('error-panel-premium'),
    errorMessage:          document.getElementById('error-message-premium'),
    viewDataBtn:           document.getElementById('view-data-btn-premium'),
    verifArticle:          document.getElementById('verif-article-premium'),
    verifMax:              document.getElementById('verif-max-premium'),
    verifScaling:          document.getElementById('verif-scaling-premium'),
  },

  // Classic UI Refs
  classic: {
    offenseSelect:         document.getElementById('offense-classic'),
    subArticleSelect:      document.getElementById('sub-article-classic'),
    classificationSelect:  document.getElementById('classification-classic'),
    sanctionTypeSelect:    document.getElementById('sanction-type-classic'),
    guiltDegreeSelect:     document.getElementById('guilt-degree-classic'),
    consequenceSelect:     document.getElementById('consequence-gravity-classic'),
    executionSelect:       document.getElementById('execution-type-classic'),
    dataStatus:            document.getElementById('data-status-classic'),
    calculateBtn:          document.getElementById('calculate-btn-classic'),
    resultPanel:           document.getElementById('result-panel-classic'),
    resultNumber:          document.getElementById('result-years-classic'),
    resultRange:           document.getElementById('result-range-classic'),
    resultBreakdownBody:   document.getElementById('result-breakdown-classic'),
    resultSteps:           document.getElementById('result-steps-classic'),
    errorPanel:            document.getElementById('error-panel-classic'),
    errorMessage:          document.getElementById('error-message-classic'),
    viewDataBtn:           document.getElementById('view-data-btn-classic'),
    proofGrid:             document.getElementById('proof-grid-classic'),
  }
};

// ─── Theme Toggling ───────────────────────────────────────────────────────
function setTheme(theme) {
  appState.activeTheme = theme;
  
  if (theme === 'premium') {
    dom.themeLinkPremium.disabled = false;
    dom.themeLinkClassic.disabled = true;
    
    dom.btnTogglePremium.classList.add('active');
    dom.btnToggleClassic.classList.remove('active');
    
    dom.uiPremium.style.display = 'block';
    dom.uiClassic.style.display = 'none';
  } else {
    dom.themeLinkClassic.disabled = false;
    dom.themeLinkPremium.disabled = true;
    
    dom.btnToggleClassic.classList.add('active');
    dom.btnTogglePremium.classList.remove('active');
    
    dom.uiClassic.style.display = 'block';
    dom.uiPremium.style.display = 'none';
  }
}

dom.btnTogglePremium.addEventListener('click', () => setTheme('premium'));
dom.btnToggleClassic.addEventListener('click', () => setTheme('classic'));


// ─── Dropdown Population ──────────────────────────────────────────────────
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

function buildDropdowns(model, ui) {
  populateSelect(ui.offenseSelect, [model.articleName], 'Criminal Offense');
  ui.offenseSelect.value = model.articleName;

  populateSelect(ui.subArticleSelect, model.subArticles.map(sa => sa.label), 'Sub-Article');

  const ref = model.subArticles[0].factors;
  populateSelect(ui.classificationSelect, Object.keys(ref.classification), 'Hierarchy');
  
  populateSelect(ui.sanctionTypeSelect, ['Kazna zatvora'], 'Sanction');
  ui.sanctionTypeSelect.value = 'Kazna zatvora';

  populateSelect(ui.guiltDegreeSelect, Object.keys(ref.guilt),       'Culpability');
  populateSelect(ui.consequenceSelect, Object.keys(ref.consequence), 'Consequence');
  populateSelect(ui.executionSelect,   Object.keys(ref.execution),   'Execution');

  ui.calculateBtn.disabled = false;
}

function buildAllDropdowns(model) {
  buildDropdowns(model, dom.premium);
  buildDropdowns(model, dom.classic);
}

// ─── Sync Input Selection ─────────────────────────────────────────────────
// Ensures picking an option in one UI carries over to the other.
function syncSelects(fieldId) {
  const p = dom.premium[fieldId];
  const c = dom.classic[fieldId];
  p.addEventListener('change', () => c.value = p.value);
  c.addEventListener('change', () => p.value = c.value);
}

syncSelects('subArticleSelect');
syncSelects('classificationSelect');
syncSelects('guiltDegreeSelect');
syncSelects('consequenceSelect');
syncSelects('executionSelect');


// ─── Shared Calculation Logic ─────────────────────────────────────────────
function calculateResult() {
  const inputs = {
    // Both UIs are synced, read from active or premium as SSOT
    subArticleLabel: dom.premium.subArticleSelect.value,
    classification:  dom.premium.classificationSelect.value,
    guilt:           dom.premium.guiltDegreeSelect.value,
    consequence:     dom.premium.consequenceSelect.value,
    execution:       dom.premium.executionSelect.value,
  };

  const missing = Object.entries(inputs).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    showError({ message: `MISSING_PARAMETERS: ${missing.join(', ')}` });
    return;
  }

  try {
    const profile = calculate(inputs, appState.model);
    showResult(profile, inputs);
  } catch (err) {
    showError(err);
  }
}

dom.premium.calculateBtn.addEventListener('click', calculateResult);
dom.classic.calculateBtn.addEventListener('click', calculateResult);


// ─── Rendering (Dual Execution) ───────────────────────────────────────────
function showResult(profile, inputs) {
  // Premium Presentation
  dom.premium.errorPanel.style.display  = 'none';
  dom.premium.resultPanel.style.display = 'block';
  
  dom.premium.resultNumber.textContent = profile.result.toFixed(2);
  dom.premium.resultRange.textContent  = `Adjudication range for ${profile.subArticle}: ${profile.min} – ${profile.max} years`;
  
  dom.premium.resultBreakdownBody.innerHTML = `
    <tr><td>Hierarchy Classification</td><td>${inputs.classification}</td><td class="td-value">${(profile.weights.classification * 100).toFixed(1)}%</td><td class="td-shift">+${(profile.weights.classification * profile.max).toFixed(3)}</td></tr>
    <tr><td>Degree of Culpability</td><td>${inputs.guilt}</td><td class="td-value">${(profile.weights.guilt * 100).toFixed(1)}%</td><td class="td-shift">+${(profile.weights.guilt * profile.max).toFixed(3)}</td></tr>
    <tr><td>Gravity of Harm</td><td>${inputs.consequence}</td><td class="td-value">${(profile.weights.consequence * 100).toFixed(1)}%</td><td class="td-shift">+${(profile.weights.consequence * profile.max).toFixed(3)}</td></tr>
    <tr><td>Execution Context</td><td>${inputs.execution}</td><td class="td-value">${(profile.weights.execution * 100).toFixed(1)}%</td><td class="td-shift">+${(profile.weights.execution * profile.max).toFixed(3)}</td></tr>
  `;

  dom.premium.verifArticle.textContent = ARTICLE_217_DATA.articleName;
  dom.premium.verifMax.textContent     = `${profile.max}.00 Years`;
  dom.premium.verifScaling.textContent = `${((profile.result / profile.max) * 100).toFixed(2)}% of Final Limit`;
  dom.premium.resultSteps.innerHTML = profile.steps.map(s => `<li>${s}</li>`).join('');

  // Classic Presentation
  dom.classic.errorPanel.style.display  = 'none';
  dom.classic.resultPanel.style.display = 'block';

  dom.classic.resultNumber.textContent = profile.result.toFixed(2);
  dom.classic.resultRange.textContent  = `Legal range for ${profile.subArticle}: ${profile.min} – ${profile.max} years`;

  dom.classic.resultBreakdownBody.innerHTML = `
    <table class="breakdown-table">
      <thead>
        <tr><th>Factor Dimension</th><th>Selection</th><th>Result Shift</th></tr>
      </thead>
      <tbody>
        <tr><td>Classification</td><td class="selection-cell">${inputs.classification}</td><td>+${(profile.weights.classification * profile.max).toFixed(3)}</td></tr>
        <tr><td>Degree of Guilt</td><td class="selection-cell">${inputs.guilt}</td><td>+${(profile.weights.guilt * profile.max).toFixed(3)}</td></tr>
        <tr><td>Gravity of Harm</td><td class="selection-cell">${inputs.consequence}</td><td>+${(profile.weights.consequence * profile.max).toFixed(3)}</td></tr>
        <tr><td>Execution Context</td><td class="selection-cell">${inputs.execution}</td><td>+${(profile.weights.execution * profile.max).toFixed(3)}</td></tr>
      </tbody>
    </table>
  `;

  dom.classic.proofGrid.innerHTML = `
    <div class="proof-item"><div class="proof-label">Source</div><div class="proof-value">${ARTICLE_217_DATA.articleName}</div></div>
    <div class="proof-item"><div class="proof-label">Max Limit</div><div class="proof-value">${profile.max}.00 Years</div></div>
    <div class="proof-item"><div class="proof-label">Relative Scale</div><div class="proof-value">${((profile.result / profile.max) * 100).toFixed(2)}% of Max</div></div>
  `;
  dom.classic.resultSteps.innerHTML = profile.steps.map(s => `<li>${s}</li>`).join('');

  // Scroll to whichever panel is active
  if (appState.activeTheme === 'premium') dom.premium.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else dom.classic.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showError(err) {
  dom.premium.resultPanel.style.display = 'none';
  dom.premium.errorPanel.style.display  = 'block';
  dom.premium.errorMessage.textContent  = `FAULT_CODE: ${err.message}`;

  dom.classic.resultPanel.style.display = 'none';
  dom.classic.errorPanel.style.display  = 'block';
  dom.classic.errorMessage.textContent  = `FAULT_CODE: ${err.message}`;
}


// ─── Init ──────────────────────────────────────────────────────────────────
function init() {
  try {
    dom.premium.dataStatus.textContent = 'ENGINE_ONLINE';
    dom.classic.dataStatus.textContent = 'SECURE';
    
    // Default theme setup
    setTheme('premium');
    
    // Build identical dropdowns for both interfaces
    buildAllDropdowns(appState.model);
    
    console.info('Dual Mode UI Initialized. Runtime Active.');
  } catch (err) {
    console.error('Initialization error:', err);
    dom.premium.dataStatus.textContent = 'ENGINE_FAULT';
    dom.classic.dataStatus.textContent = 'FAULT';
    showError(err);
  }
}

dom.premium.viewDataBtn.addEventListener('click', () => {
  console.log('Active Adjudication Model:', appState.model);
  alert('Source model state logged to central console.');
});
dom.classic.viewDataBtn.addEventListener('click', () => {
  console.log('Active Adjudication Model:', appState.model);
  alert('Normalized model exported to developer console.');
});

document.addEventListener('DOMContentLoaded', init);
