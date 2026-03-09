# Implementation Plan — Fix for "Same Years" Runtime Bug

The Auditor and Prosecutor have identified that the calculator exhibits "fake-dynamic" behavior: selections change, but the final output often remains frozen (at 2.60 or 1.30) or uses the wrong base range.

## Root Cause Analysis
1.  **Fragile Anchor Detection**: `findAnchorRow` in `parser.js` scans entire rows for "Stav 1" or "Stav 2". If these strings appear in descriptive text or differently-formatted cells, the wrong block is parsed.
2.  **Label Mismatch**: Newlines or hidden characters in the CSV (e.g., `'S\ntav 1'`) cause `find()` in `calculator.js` to fail or skip the correct sub-article, occasionally falling back to the wrong one or defaulting behavior.
3.  **Data Inconsistency**: Factor weights for many different selections are identical in the source data (7.0%), leading to a perception of "frozen" behavior even when the code is technically calculating.
4.  **Column Alignment**: `FACTOR_COLUMN_ORDER` relies on a fixed relative offset from the "Min" label. 

## Proposed Changes

### [Component] Domain & Exceptions
#### [MODIFY] [exceptions.js](file:///home/zenmasterlex/Downloads/Antigravity/Sanctions%20Calculator%20V2/src/domain/exceptions.js)
- Ensure all exceptions carry enough context (e.g., which key failed, what was the expected range).

### [Component] Parsing & Data Ingestion
#### [MODIFY] [parser.js](file:///home/zenmasterlex/Downloads/Antigravity/Sanctions%20Calculator%20V2/src/services/parser.js)
- **Robust Anchor Search**: Modify `findAnchorRow` to recognize labels even with embedded newlines or extra whitespace.
- **Strict Block Validation**: After finding an anchor, verify the structural presence of "Min", "Max", and "Element" at specific relative offsets. Throw if the structure is broken.
- **Key Normalization**: Pass the label explicitly to the sub-article object to ensure it exactly matches the dropdown labels.

### [Component] Calculation Engine
#### [MODIFY] [calculator.js](file:///home/zenmasterlex/Downloads/Antigravity/Sanctions%20Calculator%20V2/src/services/calculator.js)
- **Safe Matching**: Use case-insensitive and whitespace-stripped matching when looking up sub-articles by label.
- **Enhanced Audit Trail**: Explicitly log the specific `SubArticle` object ID or label being used to the `steps[]` trace.
- **Value Verification**: Assert that `profile.result` is derived from the *resolved* `baseMax`, not a static constant.

### [Component] Main Application Logic
#### [MODIFY] [main.js](file:///home/zenmasterlex/Downloads/Antigravity/Sanctions%20Calculator%20V2/main.js)
- **UI Reset**: Clear the result panel before performing a new calculation.
- **Deep Logging**: Update the "Log Data" button to show a summary of weights to help users understand why some selections (like classification) don't change the outcome.

## Verification Plan

### Automated Tests
- `npm run test`: Verify that the existing Scenario A and B still pass.
- Add a new test case for "Stav Mismatch" to ensure the calculator throws when labels don't match exactly.

### Manual Verification
- Use the **Browser Subagent** to:
  1. Select 'Stav 1' and a set of factors -> Note result.
  2. Select 'Stav 2' and the SAME factors -> Result MUST be different (ideally 50% of the first).
  3. Change the Consequence to 'Izuzetno' -> Result MUST decrease.
  4. Expand 'Audit Trail' and verify `baseRange = [0.5, 5]` is shown for Stav 2.
