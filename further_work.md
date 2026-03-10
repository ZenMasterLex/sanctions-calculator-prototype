# Further Work

## Current Status

- `npm run build` passes.
- `npm run test` fails.
- Runtime uses static `ARTICLE_217_DATA`, not live CSV parsing.

## Priority Issues

### 1. Broken test suite due to contract mismatch

- Severity: Critical
- Impact: The test suite is not a valid release gate because `calculator.js` and `calculator.test.js` do not agree on the model shape.
- Recommended solution: Choose one canonical calculation model and update both implementation and tests to use it consistently.

### 2. Duplicate competing data models across runtime layers

- Severity: High
- Impact: Parser, normalizer, calculator, and runtime are drifting because the repo carries multiple incompatible shapes for the same sanction data.
- Recommended solution: Standardize on one runtime model and make parser/normalizer outputs adapt into that model.

### 3. Runtime bypasses parser and CSV source of truth

- Severity: High
- Impact: Changes to the shipped CSV files do not affect the actual application, so the app can silently diverge from the legal source data.
- Recommended solution: Either wire runtime to parsed CSV data or remove parser/CSV claims from the production path and treat static data as the intentional source.

### 4. Documentation is stale and inaccurate

- Severity: High
- Impact: The repo currently claims parser-backed runtime behavior and passing tests when neither is true, which misleads future work.
- Recommended solution: Update or remove outdated walkthrough and audit notes so documentation matches the codebase.

### 5. Unsafe `innerHTML` rendering in both themes

- Severity: Medium
- Impact: Current rendering paths become an injection risk if parser-fed or external content is later rendered into the result areas.
- Recommended solution: Replace string-built markup with DOM construction using `createElement()` and `textContent`.

### 6. UI factor options are derived only from `subArticles[0]`

- Severity: Medium
- Impact: If sub-articles diverge in available factors, the UI will present invalid combinations and calculations.
- Recommended solution: Rebuild dependent selects from the currently selected sub-article rather than a hardcoded first entry.

### 7. Parser canonical mapping code is declared but unused

- Severity: Medium
- Impact: The parser is less resilient than its comments suggest and relies on fixed structure more than actual normalization.
- Recommended solution: Either remove the dead canonical mapping layer or apply it for real when resolving CSV keys.

### 8. Exception assertions in tests are weak

- Severity: Medium
- Impact: Failure-mode tests do not verify the intended exception class precisely, reducing confidence in error handling.
- Recommended solution: Assert the specific custom exception type and expected message patterns.

### 9. Premium mobile layout tuning is still too narrow

- Severity: Low
- Impact: Some mobile widths can still produce cramped layouts because the premium breakpoint strategy is minimal.
- Recommended solution: Revisit premium mobile breakpoints and align form/table behavior across common phone widths.

### 10. CSS scoping and accessibility gaps remain in both themes

- Severity: Low
- Impact: Theme rules are broader than necessary and keyboard focus treatment is incomplete for interactive controls.
- Recommended solution: Scope theme-specific selectors more tightly and add visible `:focus-visible` styles for buttons, toggles, and details controls.

### 11. Repo hygiene is weak

- Severity: Low
- Impact: Legacy, reference, and generated assets increase review noise and make it harder to identify the authoritative implementation.
- Recommended solution: Separate archive/reference material from active app code and keep generated output out of the main review surface.

## Recommended Workflow

- Unify the canonical data model first.
- Refactor calculator, parser, normalizer, and runtime to that model.
- Repair unit tests to match the real contract.
- Add one CSV-to-calculation integration test.
- Wire runtime to the chosen source of truth.
- Replace `innerHTML` result rendering with safe DOM construction.
- Fix UI-dependent option rebuilding based on selected sub-article.
- Clean stale docs and remove or isolate legacy/reference assets.
- Finish with CSS and accessibility cleanup.

## Release Assessment

- Current state is not release-ready.
- The project should not be treated as verified until one source of truth is established and automated verification passes again.
