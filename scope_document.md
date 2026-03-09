# Scope Document for the Builder

## 1. Auditor Analysis of the Data Source

Based on the Auditor’s review of the two input CSV files (`AUTOMATIC SANCTION CALCULATOR.xlsx - Sheet1_TTL.csv` and `AUTOMATIC SANCTION CALCULATOR.xlsx - Sheet1__.csv`), the data structure is non-standard and highly complex.

**Key Findings:**
- **Irregular Matrix Format:** The CSVs contain multiple disconnected sub-tables, empty rows, descriptive headers intermixed with values, and differing representations of multipliers (e.g., decimals like `0.5` vs. percentages like `7.0%`).
- **Data Inconsistencies:** Misspellings and varied translations exist (e.g., "Direktini umisljaj", "Doluz directus").
- **Embedded Logic:** The data contains Boolean arrays (`TRUE`/`FALSE`) and raw min/max bounds representing distinct conditions (e.g., "Stav 1" vs. "Stav 2").

## 2. Strict Requirements (Prosecutor Guidelines)

The Builder must adhere to the following strict principles during implementation. Failure to do so will result in immediate rejection. **There is no room for "silent fallbacks", "hardcoding disguised as dynamic behavior", or "flattened data structures".**

### 2.1. Parsing and Ingestion
- **No Parser Assumptions:** Do not assume strict row/column indices (e.g., `row[23]`). The parser must dynamically identify section anchors (e.g., "Stepen krivnje") and parse the subsequent table blocks.
- **Fail Loudly:** If a required weight, classification, or sub-article boundary is missing or unparseable, the system must throw an explicit error (`MissingFactorException`). Do not silently fallback to a weight of `0` or `1`.
- **Typo-Resilience vs. Logic:** Normalize keys at the ingestion stage using exact mappings. Do not use generic string "includes" checks to map values.

### 2.2. Internal Data Structures
- **Do Not Flatten:** Keep the domain model pure. The data must be projected into a nested entity structure:
  - `CrimeArticle` (e.g., Art. 217)
  - `SubArticle` (e.g., Stav 1, Stav 2) -> Contains `BaseRange` (Min, Max)
  - `FactorMatrix` -> Contains explicit mappings for Guilt, Consequence, and Execution types.
- **Immutable Values:** Provide a resolved `SanctionProfile` object for every calculation that logs the exact weights and bounds applied.

### 2.3. Calculation Engine
- **Exact Functions Involved:** The calculation logic must be completely decoupled from the UI/Presentation layer in a dedicated `CalculationEngine` service.
- **Traceability:** The engine must record the step-by-step arithmetic (e.g., `Base + (Base * Factor)`) so that it can be audited.

### 2.4. Required Verification Proofs
The Builder must provide automated tests demonstrating the following. For every scenario:
1. State the **exact functions involved**.
2. State the **internal data structure used**.
3. Provide **two concrete example inputs/selections**.
4. Show the **resolved internal values for each example**.
5. Provide **proof that outputs differ when they should**.

Example Test Scenarios Required:
- **Scenario A:** Art. 217, Stav 1, Osnovni, Direktni umišljaj, Povreda.
- **Scenario B:** Art. 217, Stav 2, Visoki, Svjesni nehat, Izuzetno.
Both must produce deterministic, traceable calculations matching the expected sanctions logic.
