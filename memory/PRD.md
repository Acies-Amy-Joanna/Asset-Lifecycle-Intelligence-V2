# ALI – Customer Intelligence Platform — PRD

## Original Problem Statement
Build a polished, responsive B2B SaaS customer intelligence platform ("ALI") on top of a fictional/simulated B2B digital learning product (inspired by Udemy Business). It unifies customer usage, adoption, licensing, health, renewal, risks, opportunities, and recommended actions. Core principle: intelligence must be explainable (What happened → Why → Evidence → Business Impact → Recommended Action) and connected across screens (Customer → Usage → Adoption → Health → Risk/Opportunity → Evidence → Action). Derived intelligence must NOT be hardcoded into raw data.

## User Choices (Iteration 1)
- Frontend-only (full-stack deferred to later iterations)
- Pre-generated rich simulated dataset with derived intelligence at seed time
- No auth (open access)
- Design decided by agent (enterprise SaaS, slate/blue palette, Plus Jakarta Sans + Inter)
- All 7 screens delivered now

## Architecture
- React 19 + react-router-dom 7, Tailwind + shadcn/ui, recharts 3, lucide-react
- No backend / no MongoDB used yet (all data client-side)
- Intelligence engine: `/app/frontend/src/data/dataset.js` — seeds 24 fictional customers with raw facts (licensing, monthly usage Jan–Dec 2025, features, support, engagement) and DERIVES health score/status/trend/drivers, renewal risk, revenue at risk, churn indicator, adoption stage, opportunities (Upsell/Cross-sell/License Expansion/Whitespace) with readiness, recommended actions, anomalies, and portfolio aggregates.
- Shared components: KpiCard, Badges, SectionCard, InsightCard (expandable), EvidenceList, DataTable (sortable/paginated), ActionDrawer, Sidebar/TopBar/AppLayout.

## User Personas
- Customer Success Manager / Head of CS (portfolio health, risk triage)
- Account Manager / Sales (expansion opportunities)
- Leadership (executive overview)

## Core Requirements (static)
- 7 screens: Overview, Customers, Customer 360, Adoption & Utilization, Health & Renewal, Growth & Expansion, Actions
- Persistent sidebar + top nav (search, alerts, profile, breadcrumbs)
- Explainable insights with expandable evidence
- Cross-screen drill-downs (KPIs → filtered lists → Customer 360; insights/actions → detail)
- Sortable/filterable/paginated tables, multi-select filters + chips, action detail drawer

## Implemented (2026-06-18)
- All 7 screens fully built and verified (testing agent: 100% of listed frontend flows pass)
- Derived-intelligence data engine (24 customers, realistic variation across health/risk/opportunity)
- KPI drill-downs, cross-screen navigation with query-param filters (?risk, ?type)
- Global command search (⌘K), risk-alert notifications dropdown, customer switcher
- Expandable insight/evidence, action detail drawer with What/Why/Evidence/Impact/Next Step
- Charts: health donut/trend, revenue-at-risk buckets, usage trend (toggle), DAU/WAU/MAU, feature adoption bars, scatter (health vs utilization), readiness/stage pies
- Fixed a11y DialogTitle warning on command dialog

## Prioritized Backlog
- P0 (next): Full-stack — move dataset to FastAPI + MongoDB; compute derivations server-side from raw facts via API
- P1: Authentication (JWT or Google), per-user action ownership/status persistence, real filters on Date/Period, saved views
- P1: Additional Customer 360 depth (stakeholder matrix, per-product breakdown)
- P2: CSV export, more anomaly types, benchmark configuration, dark mode

## Implemented (2026-06-18) — Iteration 2 (data swap done)
- **Part 1 — Real dataset**: The uploaded workbook (ALI_Udemy_MVP_Mock_Data.xlsx) is now the app's data. Aggregated via `/app/scripts/xl_build.py` into `/app/frontend/src/data/ali_data.json` (10 customers, 1,900 users, 111K dated usage events, 8 features, licenses, renewals, commercial figures, support tickets). `dataset.js` derives ALL intelligence (health/status/trend/drivers, usage & active-user growth from 12-month series, feature adoption from last-3-vs-prev-3-month distinct adopters, license utilization, opportunities, readiness, priorities, recommended actions, anomalies) from these raw facts. Commercial dollar figures (ARR, revenue-at-risk, upsell/cross-sell/expansion potential) are read from the file; qualitative labels are computed. REFERENCE_DATE = 2025-12-31 so 2026 renewals bucket correctly.
- **Part 2 — Action status + owner** (localStorage): toggle Open↔Completed and free-text Owner in Actions table + drawer; counters and Overview "AI Actions Pending" update live.
- **Part 3 — CSV export** on Customers, Renewal Risk, Actions (honors current filters/search/sort).
- Verified: clean compile; Overview/Customers/Customer 360/Adoption render real data with correct derivations (e.g. Acme At Risk, −24.2% usage).

## Next Tasks
1. Backend API (FastAPI + MongoDB) to serve the dataset and compute derivations server-side; move action status/owner to shared storage
2. Optional auth layer
3. PDF export
