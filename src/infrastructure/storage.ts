import type { AppState, Product, PreparedItem, HistorySession } from '../domain/types';

export const STORAGE_KEY = 'sg_state_v3';
export const DEFAULT_BUDGET = 5000;

export const defaultState: AppState = {
  products: [],
  preparedItems: [],
  history: [],
  settings: {
    defaultBudget: DEFAULT_BUDGET,
  },
};

function normalizeProductOrder(products: Product[]): Product[] {
  return products.slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item, index) => ({ ...item, orderIndex: index }));
}

function normalizePreparedOrder(items: PreparedItem[]): PreparedItem[] {
  return items.slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item, index) => ({ ...item, orderIndex: index }));
}

function migrateOldState(raw: unknown): AppState {
  const safeRaw = raw as Record<string, unknown> | null;
  const rawProducts = safeRaw?.products as Array<Record<string, unknown>> | undefined;
  
  const products: Product[] = Array.isArray(rawProducts) 
    ? normalizeProductOrder(rawProducts.map((p, i: number) => ({
        id: String(p.id),
        name: String(p.name || 'Без названия'),
        unit: p.unit === 'bottles' || p.unit === 'packs' ? p.unit : 'pieces',
        targetQty: 1,
        orderIndex: i,
        priceHistory: typeof p.latestUnitPrice === 'number' && p.latestUnitPrice > 0 ? [p.latestUnitPrice] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })))
    : [];

  const rawSessions = safeRaw?.sessions as Array<Record<string, unknown>> | undefined;
  const activeSessionId = safeRaw?.activeSessionId;
  const activeSession = Array.isArray(rawSessions) && activeSessionId
    ? rawSessions.find(s => s.id === activeSessionId)
    : undefined;

  const rawItems = activeSession?.items as Array<Record<string, unknown>> | undefined;
  
  const preparedItems: PreparedItem[] = activeSession
    ? normalizePreparedOrder((rawItems || []).map((item, i: number) => ({
        id: String(item.id || Math.random().toString(36)),
        productId: String(item.productId),
        qty: Number(item.plannedQty || 1),
        orderIndex: i,
        estimatedUnitPrice: typeof item.estimatedUnitPrice === 'number' ? item.estimatedUnitPrice : null,
        actualUnitPrice: typeof item.actualUnitPrice === 'number' ? item.actualUnitPrice : null,
        picked: !!item.picked
      })))
    : [];

  const rawHistory = safeRaw?.history as HistorySession[] | undefined;

  return {
    products,
    preparedItems,
    history: Array.isArray(rawHistory) ? rawHistory : [],
    settings: {
      defaultBudget: Number(activeSession?.budgetTotal || DEFAULT_BUDGET)
    }
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    const safeParsed = parsed as Record<string, unknown>;
    const products = safeParsed?.products as Array<Record<string, unknown>> | undefined;
    
    if (parsed && typeof parsed === 'object' && Array.isArray(products) && 'priceHistory' in (products[0] || {})) {
      return parsed as AppState;
    }
    return migrateOldState(parsed);
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
