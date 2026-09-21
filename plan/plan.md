# ALI – Iteration 2 Plan

Three additions to the existing app:
1. Replace the built-in sample customers with your Excel data.
2. Let users mark actions Open/Completed and assign an owner.
3. One-click CSV export on the key tables.

---

## 1. Your Excel becomes the dataset

- The current 24 sample customers are removed and replaced by the customers in your Excel file.
- The app keeps computing health, risk, opportunity, readiness, and recommended actions from your raw numbers — the same "explainable intelligence" as today. Your file supplies the facts; the app supplies the derived intelligence.
- Whatever count of customers your file has is fine; long lists stay usable via the existing search, filters, and pagination.

### What the file needs to contain
For every screen and chart to stay at full fidelity, each customer needs these raw facts:
- Identity: name, ID, segment, industry, region
- Commercial: product(s), plan, contract start, renewal date, ARR
- Licensing: purchased / assigned / active licenses, total users, active users
- Usage over time: a monthly usage and active-user figure across the year (needed for trend lines, usage growth %, and anomalies)
- Features: per-feature adopters vs. eligible users (needed for adoption %, adoption gaps)
- Support: current vs. previous ticket counts, open tickets, critical tickets, resolution time

### If some of that is missing
Please confirm your file has month-by-month usage and per-feature detail. If it is a **single snapshot** (one row per customer, no history and no feature breakdown), the plan still works, but these specific views degrade gracefully:
- Trend charts (usage trend, health trend, DAU/WAU/MAU, ticket trend) show a flat/estimated series instead of real history.
- Feature adoption and adoption-gap views show less detail or are hidden.
- Usage anomalies (drops/spikes) may not be detectable.

Everything else (KPIs, health, risk, revenue-at-risk, opportunities, actions, tables, exports) works from a snapshot.

**Assumptions where the file is silent:** any raw fact absent from the file is estimated so the UI stays complete rather than showing blanks; derived labels (Healthy/Monitor/At Risk, priorities, opportunity types) are always computed, never read from the file.

**Dependency:** the data swap cannot be finalized until you attach the Excel file. Parts 2 and 3 below do not depend on it.

---

## 2. Action status + owner (saved in your browser)

- Each action gets a status toggle (Open ↔ Completed) and a free-text **Owner** field.
- Changes are remembered on your device (browser storage). Note the trade-offs you already accepted: it is per-device, not shared across teammates, and resets if the browser cache is cleared.
- The Actions page counters (Pending, High Priority, Open, etc.) and the Overview "AI Actions Pending" reflect these updates live.
- Setting an owner and status is available both in the Actions table and in the action detail drawer.

---

## 3. CSV export

- A "Export CSV" button on the three key tables: Customers, Renewal Risk (Health & Renewal), and Actions.
- The export contains exactly what is currently on screen — i.e. it respects the active filters, search, and sort — not the whole dataset.
- PDF export is intentionally out of scope for this iteration (CSV only, per your choice).

---

## Decisions on record
- Excel is baked in as the app's dataset, replacing the samples (no in-app upload button this round).
- App derives all intelligence from raw facts.
- Status/owner persistence via browser storage only (no backend yet).
- Owner is free-text.
- CSV export only, scoped to Customers / Renewal Risk / Actions, honoring current filters.

## Open item for you
- Attach the Excel file, and confirm whether it includes monthly history and per-feature detail (full fidelity) or is a single snapshot (reduced-fidelity trend/feature views as described above).
