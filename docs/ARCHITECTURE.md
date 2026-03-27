# Application Architecture

## Domain Model (TypeScript-ready)

```ts
export type ID = string

export type StockStatus = 'in_stock' | 'low' | 'out'
export type SessionStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'
export type PriceRoundingStep = 10 | 50 | 100

export interface Product {
  id: ID
  name: string
  unit: string // e.g. "pcs", "kg", "l"
  category?: string
  stockStatus: StockStatus
  priority: number // 1..5
  targetQty?: number
  latestUnitPrice?: number
  createdAt: string
  updatedAt: string
}

export interface ShoppingItem {
  id: ID
  productId: ID
  plannedQty: number
  priorityScore: number
  estimatedUnitPrice: number
  estimatedTotal: number // plannedQty * estimatedUnitPrice
  picked: boolean
  actualUnitPrice?: number
  roundedUnitPrice?: number
  actualTotal?: number // plannedQty * roundedUnitPrice
  removedReason?: 'over_budget' | 'manual'
}

export interface ShoppingSession {
  id: ID
  date: string
  name?: string
  budgetTotal: number
  budgetSpent: number
  budgetRemaining: number
  roundingStep: PriceRoundingStep
  status: SessionStatus
  itemIds: ID[]
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface PurchaseHistoryEntry {
  id: ID
  sessionId: ID
  productId: ID
  qty: number
  unitPrice: number
  roundedUnitPrice: number
  total: number
  purchasedAt: string
}

export interface AppState {
  products: Record<ID, Product>
  sessions: Record<ID, ShoppingSession>
  items: Record<ID, ShoppingItem>
  history: Record<ID, PurchaseHistoryEntry>
  activeSessionId?: ID
  settings: {
    currency: string
    roundingStepDefault: PriceRoundingStep
  }
}
```

## Relationships

- One `ShoppingSession` -> many `ShoppingItem`.
- One `ShoppingItem` -> one `Product`.
- One completed `ShoppingItem` can generate one `PurchaseHistoryEntry`.
- One `Product` -> many `PurchaseHistoryEntry` records.

## Derived/Computed Fields

- `ShoppingSession.budgetSpent = sum(item.actualTotal where picked && !removedReason)`
- `ShoppingSession.budgetRemaining = budgetTotal - budgetSpent`
- `Product.latestUnitPrice = latest history entry roundedUnitPrice`
- `ShoppingItem.estimatedTotal = plannedQty * estimatedUnitPrice`
- Price delta for product: `latest - previous`

## State Management Strategy

## Global state
- Products
- Sessions
- Shopping items
- History
- App settings

Use a centralized reducer + context (or lightweight store), because entities are shared across multiple screens.

## Local state
- Form inputs
- Temporary filters/sort options
- Draft UI interaction state (modals, editing row)

## Persistence Strategy

Use a storage adapter to isolate browser API:

```ts
interface StorageAdapter {
  load(): AppState | null
  save(state: AppState): void
  clear(): void
}
```

Recommended keys:
- `sg_state_v1` for normalized app state
- `sg_migrations` for migration metadata (optional)

Rules:
- Debounced save on global state changes.
- Schema versioning inside persisted payload.
- Safe parse + fallback to defaults.

## Suggested Folder Structure

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  domain/
    models.ts
    selectors.ts
    reducers.ts
    services/
      prioritization.ts
      budgeting.ts
      sessionLifecycle.ts
  persistence/
    storage.ts
    migrations.ts
  features/
    catalog/
      CatalogScreen.tsx
      ProductForm.tsx
      ProductList.tsx
    preparation/
      PreparationScreen.tsx
      BudgetPanel.tsx
      SuggestedItemsList.tsx
    inStore/
      InStoreScreen.tsx
      PriceInputRow.tsx
      RemainingBudget.tsx
    history/
      HistoryScreen.tsx
      SessionHistoryList.tsx
      ProductPriceTrend.tsx
  ui/
    Button.tsx
    Input.tsx
    Tabs.tsx
    Badge.tsx
  utils/
    money.ts
    dates.ts
    ids.ts
```

## Component Hierarchy

- `AppShell`
  - `NavigationTabs`
  - `CatalogScreen`
  - `PreparationScreen`
  - `InStoreScreen`
  - `HistoryScreen`

Each screen composes feature components and consumes domain selectors/actions; UI components stay dumb/presentational.

## Separation of Concerns

- UI: pure render + user events.
- Domain: business rules, reducers, selectors, algorithms.
- Persistence: local storage read/write, migrations.
- Utils: formatting, rounding helpers, pure helpers.
