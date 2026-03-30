# Core Logic

## Data Model Rules

- Product contains only nominal target quantity (`targetQty`) and unit (`pieces | liters | grams`).
- Product does not store current home stock amount.
- Unknown unit price is stored as `null` and shown in UI as `?`.
- Prepared shopping list is a single active list shared by Preparation and Store tabs.
- Global budget is stored once (`defaultBudget`) and reused for future purchases.

## Reordering and Interaction

- Reordering in lists is done by drag-and-drop using a dedicated handle icon.
- Single deletion always requires user confirmation.
- Bulk deletion mode is available in Catalog, Preparation, and Store.
- After any deletion (single or bulk), undo is available for 5 seconds.

## Preparation Flow

1. User manages assortment with nominal quantity per product.
2. User adds shortage amount from assortment into preparation list.
3. Default shortage quantity equals product nominal quantity, but can be reduced.
4. Prepared items are shown at the top of Preparation.

## Budget Zone Logic

- Budget zone is calculated from list top to bottom as contiguous prefix.
- For each item:
	- estimated total = `estimatedUnitPrice * qty` when price is known,
	- item is in zone only if adding it does not exceed budget.
- In-zone rows are green, out-of-zone rows are red.

## Store Flow

- Store tab always shows current prepared list (no explicit "start session" step).
- Budget is editable in Store and Preparation; both update the same persisted value.
- Picked items contribute to spent budget only when actual price is set.
- Completing purchases moves current list to history and clears active prepared list.

## History Flow

- History stores completed purchases as snapshots.
- Any history record can be fully restored back into Preparation.
- If current prepared list is not empty, restoration asks for confirmation to replace it.

## Persistence Constraints

- Use local-only state persistence.
- No auth, backend, or external APIs.
- All records must be serializable and recoverable from `localStorage`.
