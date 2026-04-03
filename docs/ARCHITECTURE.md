# Application Architecture

## Clean Architecture & DDD

The project is structured following Clean Architecture principles, ensuring separation of concerns:

- **Domain layer (`src/domain/`)**: Contains core business entities (`types.ts`) and pure business logic (`logic.ts`) independent of any UI or state management framework.
- **Application layer (`src/application/`)**: Contains use cases and state management (`store.ts` using `zustand`), orchestrating domain logic.
- **Infrastructure layer (`src/infrastructure/`)**: Contains external concerns like persistence (`storage.ts`), adapting browser `localStorage`.
- **Presentation layer (`src/presentation/`)**: Contains UI components (`components/`) and screens (`pages/`), relying solely on the Application layer to read/write state.

## Domain Model

```ts
export type ID = string;
export type Unit = 'pieces' | 'bottles' | 'packs';

export interface Product {
  id: ID;
  name: string;
  unit: Unit;
  targetQty: number;
  orderIndex: number;
  priceHistory: number[];
  createdAt: string;
  updatedAt: string;
}

export interface PreparedItem {
  id: ID;
  productId: ID;
  qty: number;
  orderIndex: number;
  estimatedUnitPrice: number | null;
  actualUnitPrice: number | null;
  picked: boolean;
}

export interface HistoryItem {
  id: ID;
  productId: ID;
  productName: string;
  unit: Unit;
  qty: number;
  estimatedUnitPrice: number | null;
  actualUnitPrice: number | null;
  total: number;
}

export interface HistorySession {
  id: ID;
  completedAt: string;
  budget: number;
  items: HistoryItem[];
}

export interface AppSettings {
  defaultBudget: number;
}

export interface AppState {
  products: Product[];
  preparedItems: PreparedItem[];
  history: HistorySession[];
  settings: AppSettings;
}
```

## State Management

We use `zustand` (`src/application/store.ts`) for global state. It provides atomic actions (`addProduct`, `moveItem`, `updatePreparedPrice`, etc.) and automatically persists the latest state using `saveState` from the infrastructure layer.

## Persistence Strategy

`localStorage` under the key `sg_state_v3`. Data migrations from legacy versions are handled during `loadState()` in `src/infrastructure/storage.ts`.
