# QA Assessment

Date: 2026-03-10

Scope reviewed:
- Application entrypoints: [index.html](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/index.html), [main.js](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/main.js)
- Core logic: [src/services/calculator.js](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/calculator.js), [src/services/parser.js](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/parser.js), [src/services/normalizer.js](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/normalizer.js)
- Data/contracts: [src/data/sanction_data.js](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/data/sanction_data.js), [src/domain/models.js](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/domain/models.js)
- Tests/docs/assets: [src/services/calculator.test.js](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/calculator.test.js), [wtf/walkthrough.md](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/wtf/walkthrough.md), `public/*.csv`

Checks run:
- `npm run test` -> failed: 3/4 tests failing
- `npm run build` -> passed
- Parser smoke checks against both shipped CSV files -> passed

## Findings

### 1. Critical: test suite is broken because the calculator and tests use different data contracts
Evidence:
- [src/services/calculator.js:22](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/calculator.js#L22) expects sub-articles shaped as `{ label, min, max, factors }`.
- [src/services/calculator.test.js:35](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/calculator.test.js#L35) builds fixtures as `{ label, baseRange, factorMatrix }`.
- The runtime failure is reproducible: `TypeError: Cannot read properties of undefined (reading 'classification')` from [src/services/calculator.js:34](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/calculator.js#L34).
- The tests also assert fields that the calculator no longer returns, such as `baseMin`, `baseMax`, and `classificationWeight` at [src/services/calculator.test.js:146](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/calculator.test.js#L146).

Impact:
- CI is red.
- The test suite cannot be trusted as a release gate.
- Future refactors will keep drifting because there is no enforced contract.

Fix:
- Pick one canonical model and use it everywhere.
- Either update `calculate()` to consume the `CrimeArticle`/`factorMatrix` model, or rewrite the tests to use the normalized `{ min, max, factors }` model actually used by the app.
- Update the returned profile shape and test assertions so they match exactly.

### 2. High: the shipped UI bypasses the parser and CSV source files completely
Evidence:
- [main.js:1](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/main.js#L1) imports hardcoded data from [src/data/sanction_data.js](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/data/sanction_data.js).
- [main.js:13](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/main.js#L13) sets that static object as app state.
- `parseCrimeArticle()` / `parseCrimeArticleFromText()` are not referenced by runtime code anywhere in the repo.

Impact:
- Updating the CSV files in `public/` does not update the actual application.
- The app can silently diverge from the legal source data while still building successfully.
- The “source model” language in the UI is misleading because the source files are not the runtime source of truth.

Fix:
- Load and parse the CSV at runtime or at build time, then derive the UI model from that parsed data.
- If the project intentionally ships frozen data, remove the unused parser path and rename the UI/reporting language to reflect that the model is embedded, not loaded from source.

### 3. High: documentation and implementation are materially inconsistent
Evidence:
- [wtf/walkthrough.md:16](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/wtf/walkthrough.md#L16) states `main.js` uses `parseCrimeArticle()`.
- [wtf/walkthrough.md:35](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/wtf/walkthrough.md#L35) claims all four tests pass.
- Current repo state does not match either claim: runtime uses static data, and `npm run test` fails.

Impact:
- The repo overstates verification status.
- New contributors will make decisions based on false implementation notes.

Fix:
- Update or remove the walkthrough and any audit notes that no longer reflect the codebase.
- Treat documentation drift as a release blocker for this repo because it is presenting legal-calculation behavior.

### 4. Medium: result rendering uses unsanitized `innerHTML` in multiple user/data-driven paths
Evidence:
- [main.js:193](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/main.js#L193), [main.js:203](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/main.js#L203), [main.js:212](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/main.js#L212), and [main.js:226](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/main.js#L226) interpolate values into HTML strings.
- The current values come from internal data/selects, but this becomes a real injection path if CSV ingestion is wired back in.

Impact:
- Low immediate exploitability in the current static-data build.
- Real XSS risk once parser-fed values or external data are rendered.

Fix:
- Build rows and list items with `document.createElement()` and `textContent` instead of HTML string concatenation.

### 5. Medium: the parser service claims canonical normalization, but the canonical maps are dead code
Evidence:
- Canonical maps are declared at [src/services/parser.js:23](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/parser.js#L23), [src/services/parser.js:33](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/parser.js#L33), [src/services/parser.js:48](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/parser.js#L48), and [src/services/parser.js:61](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/src/services/parser.js#L61).
- Those constants are never applied anywhere in the parsing flow.
- The parser currently succeeds only because it reads fixed column positions, not because it normalizes header variants.

Impact:
- The implementation is more brittle than the comments suggest.
- Variant CSV labels may parse incorrectly without any normalization step.

Fix:
- Either remove the unused canonicalization layer, or actually use it when resolving factor headers/keys from the CSV.

### 6. Medium: sub-article selection does not drive factor option sets
Evidence:
- [main.js:121](/home/zenmasterlex/Downloads/Antigravity/Sanctions Calculator V2/main.js#L121) always uses `model.subArticles[0].factors` to build dropdown options.
- There is no change handler to rebuild factor selects when the selected `Stav` changes.

Impact:
- The UI is only correct while every sub-article shares identical factor options.
- If `Stav 1` and `Stav 2` diverge later, the UI will submit invalid combinations.

Fix:
- Rebuild dependent selects on sub-article change using the selected sub-article’s factor map.

### 7. Low: repository hygiene is weak for a production review baseline
Evidence:
- `node_modules/` and `dist/` are present in the workspace.
- There are duplicate or legacy presentation assets such as `style.css` and `classic_reference/` that are not part of the active app entry.

Impact:
- Review noise is high.
- It is harder to tell what is authoritative and what is historical.

Fix:
- Add a `.gitignore` strategy that excludes generated artifacts.
- Move reference/archival assets into a clearly marked archive folder or delete them if no longer needed.

## Priority order

1. Unify the data contract across app, tests, and parser output.
2. Decide the single source of truth: CSV-driven model or embedded static model.
3. Repair the test suite and add one integration test that parses the shipped CSV and then calculates a known result.
4. Remove `innerHTML` rendering for computed rows and steps.
5. Clean up docs and stale assets so the repo state matches reality.

## Release assessment

Current status: not release-ready as an engineering baseline.

Reason:
- Build is green, but automated verification is red.
- Source-of-truth handling is ambiguous.
- The repo documentation currently misrepresents both the architecture and the test status.
