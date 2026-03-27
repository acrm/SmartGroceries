# Implementation Plan (Workshop-friendly)

This plan is incremental: every step should produce a visible demo outcome.

## Step 1: Domain Foundation

- Goal: establish type-safe business entities.
- Implement:
  - `domain/models.ts` with core interfaces and enums.
  - `domain/defaultState.ts`.
  - ID and date helper utilities.
- Expected result:
  - App compiles with typed domain model and initial state.
- AI prompt suggestion:
  - "Create TypeScript domain models for Product, ShoppingSession, ShoppingItem, and PurchaseHistory with serializable fields."

## Step 2: Persistence Layer

- Goal: add robust local persistence.
- Implement:
  - `persistence/storage.ts` with `load/save/clear`.
  - Safe JSON parsing and schema version key.
  - Debounced save trigger from app state.
- Expected result:
  - Reloading browser preserves app state.
- AI prompt suggestion:
  - "Implement a localStorage adapter with safe parsing and fallback defaults for AppState."

## Step 3: Global State and Actions

- Goal: centralize state transitions.
- Implement:
  - reducer with actions for product CRUD and session lifecycle.
  - selectors for budget totals and session lists.
  - provider hook (`useAppStore`).
- Expected result:
  - predictable, testable state updates from one source.
- AI prompt suggestion:
  - "Create a reducer + context store for Smart Grocery Planner with typed actions and selectors."

## Step 4: Product Catalog Screen

- Goal: manage household products.
- Implement:
  - `CatalogScreen` with add/edit/delete.
  - fields: name, unit, stock status, priority.
  - basic search/filter.
- Expected result:
  - user can maintain reusable product base.
- AI prompt suggestion:
  - "Build a Product Catalog screen with list + form and stock status controls."

## Step 5: Shopping Preparation Screen

- Goal: generate shopping candidates under budget.
- Implement:
  - create draft session (budget + rounding step).
  - preselect low/out-of-stock products.
  - prioritization algorithm output list with estimated totals.
- Expected result:
  - user sees a budget-aware planned shopping set.
- AI prompt suggestion:
  - "Implement preparation screen that prioritizes selected products under a budget using product priority and estimated price."

## Step 6: In-Store Mode

- Goal: execute shopping with live budget control.
- Implement:
  - pick/unpick items.
  - input actual price per item.
  - round prices up to selected step.
  - show spent/remaining budget and over-budget state.
  - allow remove item due to budget overflow.
- Expected result:
  - real-time in-store checklist and budget tracker.
- AI prompt suggestion:
  - "Build an in-store checklist with rounded price input and live remaining budget calculations."

## Step 7: Checkout and History

- Goal: persist outcomes and price evolution.
- Implement:
  - complete session action.
  - append purchase history entries.
  - update `latestUnitPrice` for products.
  - history screen for sessions + product-level price timeline.
- Expected result:
  - closed shopping sessions with reusable pricing data.
- AI prompt suggestion:
  - "Implement checkout flow that saves purchase history and updates latest product prices."

## Step 8: Core UX Polish

- Goal: improve workshop demo quality.
- Implement:
  - empty states and inline validation.
  - mobile layout tuning.
  - keyboard-first interactions.
  - basic accessibility labels.
- Expected result:
  - stable and clear demo-ready UI.
- AI prompt suggestion:
  - "Polish Smart Grocery Planner screens for mobile-first UX and accessibility without changing business logic."

## Step 9: Documentation and Demo Script

- Goal: keep docs aligned with implementation.
- Implement:
  - update `README.md`, `docs/GAME_LOGIC.md`, `docs/TODO.md`.
  - add quick workshop demo flow with 5-minute script.
- Expected result:
  - new contributors can run and demo quickly.
- AI prompt suggestion:
  - "Generate concise workshop demo steps for Smart Grocery Planner covering catalog, preparation, in-store mode, and history."
