# Product Specification

## Product Concept

Smart Grocery Planner is a frontend-only web app for planning and executing grocery purchases under a budget.

The app runs fully in-browser:
- no backend,
- no authentication,
- no external APIs,
- local persistence only.

## Problem Statement

Household shopping is often unstructured:
- people do not have a stable catalog of home products,
- shopping lists are not prioritized by limited budget,
- in-store decisions are made ad-hoc,
- real purchase prices are not captured for later planning.

Result: overspending, forgotten essentials, and weak visibility into real costs over time.

## Target Use Cases

- Prepare a daily shopping run with only missing items.
- Prioritize essentials when budget is limited.
- Track spend in-store while prices are entered live.
- Remove low-priority items when budget is exceeded.
- Save checkout result and reuse price history next time.

## Core User Flows

### 1) Catalog Management
1. User creates and edits household product catalog.
2. User marks items as in-stock / low / out-of-stock.
3. App stores product baseline data and latest known price.

### 2) Shopping Preparation
1. User starts a new shopping session with total budget.
2. App proposes products that are missing or low stock.
3. User confirms or adjusts quantities.
4. App prioritizes selected items against budget.

### 3) In-Store Mode
1. User opens in-store checklist.
2. For each picked item, user enters actual price.
3. App rounds entered price up to configured step (10 / 50 / 100).
4. App updates spent and remaining budget in real time.
5. If over budget, user removes/deprioritizes items.

### 4) Checkout and History
1. User completes session.
2. App stores immutable purchase snapshot.
3. Product latest prices and stats are updated.
4. History view shows trends and previous sessions.

## Functional Scope

## MVP
- Product catalog CRUD (name, unit, stock status, priority).
- Shopping session creation (date, budget, rounding step).
- Candidate selection from missing/low-stock products.
- Budget-based prioritization for planned list.
- In-store mode with pick toggle and live price input.
- Rounding up logic for entered prices.
- Remaining budget and over-budget indicator.
- Session completion and purchase history storage.
- Price history timeline per product (local only).

## Future Extensions
- Consumption-rate estimation from purchase cadence.
- Better prioritization model using historical volatility.
- Category-level budget caps.
- CSV export/import.
- Optional PWA offline-first UX improvements.

## Constraints and Assumptions

- Data model must stay serializable to `localStorage`.
- App must be usable in a workshop with incremental demos.
- No hidden server dependencies.
- UX should work on desktop and mobile browsers.
- Currency formatting is local and configurable.
