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

export interface ZoneItem extends PreparedItem {
  estimatedTotal: number | null;
  inZone: boolean;
}
