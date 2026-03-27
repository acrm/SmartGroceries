# Core Logic

## Session Lifecycle

- `draft`: session created with budget and rounding step.
- `in_progress`: user starts in-store actions.
- `completed`: checkout finalized, history stored.
- `cancelled`: optional non-finalized flow.

Transitions:
- `draft -> in_progress` when user confirms prepared list.
- `in_progress -> completed` on checkout.
- `draft|in_progress -> cancelled` on user abort.

## Product Selection Rules

- Candidate products for shopping are those with stock status:
	- `out`
	- `low`
- `in_stock` products are excluded by default.
- User can manually add excluded products if needed.

## Prioritization Under Budget

Base scoring idea:

`priorityScore = priorityWeight + stockWeight + affordabilityWeight`

Suggested weights:
- `priorityWeight = product.priority * 10`
- `stockWeight = 20` for `out`, `10` for `low`, `0` for `in_stock`
- `affordabilityWeight = clamp(estimatedPriceShare, 0, 20)` (cheaper essentials can rise)

Pseudo-flow:

```text
input: selected candidates, budget
sort candidates by priorityScore desc
planned = []
spent = 0

for item in sorted candidates:
	if spent + item.estimatedTotal <= budget:
		planned.add(item)
		spent += item.estimatedTotal
	else:
		mark item as deferred_over_budget

output: planned, deferred
```

## In-Store Budget Tracking

Budget state:
- `budgetSpent = sum(actualTotal for picked && not removed)`
- `budgetRemaining = budgetTotal - budgetSpent`

When item price changes:
1. compute rounded price (up to step),
2. recompute item `actualTotal`,
3. recompute session totals.

If remaining budget < 0:
- show over-budget warning,
- allow quick remove action for lower-priority items.

## Price Rounding Logic

Rounding step is configurable by session (`10 | 50 | 100`).

Pseudocode:

```text
roundUp(value, step):
	if value <= 0 -> 0
	return ceil(value / step) * step
```

Examples:
- `241` with step `10` -> `250`
- `241` with step `50` -> `250`
- `241` with step `100` -> `300`

## Checkout Logic

On completion:
1. freeze session snapshot,
2. append purchase history entries for picked items,
3. update product latest price,
4. persist updated state.

## UI Screen Responsibilities

## Product Catalog
- Manage reusable household products.
- Edit stock status, unit, and priority.

## Shopping Preparation
- Select needed items.
- Define budget and rounding step.
- Preview prioritized list under budget.

## In-Store Mode
- Mark items as picked.
- Input actual prices and monitor budget.
- Remove items if over budget.

## History
- Review past shopping sessions.
- Inspect per-product price changes.

## Persistence Constraints

- Use local-only state persistence.
- No auth, backend, or external APIs.
- All records must be serializable and recoverable from `localStorage`.
