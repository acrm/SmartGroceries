# Core Logic

## Data Model Rules

- Product contains nominal target quantity (`targetQty`) and unit (`pieces | bottles | packs`).
- Product does not store current home stock amount.
- Price history (`priceHistory`) stores an array of known prior prices.
- Unknown unit price is stored as `null` and shown in UI as `?`.
- Prepared shopping list is a single active list shared by Preparation and Store tabs.
- Global budget is stored once (`defaultBudget`) and reused for future purchases.

## Reordering and Interaction

- Reordering in lists is done via `dnd-kit` drag-and-drop using a dedicated handle icon (alongside `<DragOverlay>`).
- Quick move buttons (arrows/plus) exist for instant list-to-list transitions.
- Adding a new product is done via an inline button at the end of the list.
- Bulk deletion mode allows combined removal of multiple items.
- After any deletion, undo may be triggered within a short time window.

## Preparation Flow

1. User manages assortment with nominal quantity per product.
2. User freely drops or clicks to move products from Assortment list into Preparation list.
3. Default shortage quantity equals product nominal quantity upon drop, but can be edited in place.

## Budget Zone Logic

- A 2-line layout is used. The first line shows the total allocated in the zone.
- The second line accounts for the remainder and the number of unpriced items (`noPriceCount`).
- Budget zone is calculated from list top to bottom.
- For each item:
  - estimated total = `(actualUnitPrice OR estimatedUnitPrice) * qty`
  - item is in zone only if adding it does not exceed budget.
- In-zone rows are highlighted green/normal, out-of-zone rows are visually distinct (e.g. red).

## Store Flow

- Store tab uses two draggable lists ("К покупке" / Unpicked and "В корзине" / Picked).
- Picked items contribute to spent budget only when actual price is set.
- Completing purchases moves current list to history, clears active prepared list, and pushes `actualUnitPrice` to the product's `priceHistory`.

## History Flow

- History stores completed purchases as snapshots.
- Any history record can be fully restored back into Preparation.

## Architecture & Persistence Constraints

- The project uses Clean Architecture / Domain-Driven Design (DDD) with layers: Domain, Application, Infrastructure, Presentation.
- Zustand is used for state management in the Application layer.
- Use local-only state persistence (`localStorage` via Infrastructure adapter).
- Records must be serializable and gracefully migrated from older storage schemas (e.g., liters -> bottles).
