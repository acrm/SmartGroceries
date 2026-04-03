import { create } from 'zustand';
import type { AppState, Product } from '../domain/types';
import { loadState, saveState } from '../infrastructure/storage';

export interface ShoppingStore extends AppState {
  setTab: (tab: 'catalog' | 'preparation' | 'store' | 'history') => void;
  activeTab: 'catalog' | 'preparation' | 'store' | 'history';
  addProduct: (product?: Partial<Product>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProducts: (ids: string[]) => void;
  setBudget: (val: number) => void;
  moveItem: (id: string, targetList: 'assortment' | 'prepared' | 'picked' | 'unpicked', overId?: string) => void;
  updatePreparedQty: (id: string, newQty: number) => void;
  updatePreparedPrice: (id: string, price: number | null, isActual: boolean) => void;
  reorderProducts: (activeId: string, overId: string) => void;
  reorderPrepared: (activeId: string, overId: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const useStore = create<ShoppingStore>((set) => ({
  ...loadState(),
  activeTab: 'catalog',

  setTab: (tab) => set({ activeTab: tab }),

  addProduct: (p) => set((state) => {
    const newProduct: Product = {
      id: generateId(),
      name: p?.name || '',
      unit: p?.unit || 'pieces',
      targetQty: p?.targetQty || 1,
      orderIndex: state.products.length,
      priceHistory: p?.priceHistory || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const next = { ...state, products: [...state.products, newProduct] };
    saveState(next);
    return next;
  }),

  updateProduct: (id, updates) => set((state) => {
    const nextProducts = state.products.map(p => p.id === id ? { ...p, ...updates } : p);
    const next = { ...state, products: nextProducts };
    saveState(next);
    return next;
  }),

  deleteProducts: (ids) => set((state) => {
    const noProducts = state.products.filter(p => !ids.includes(p.id));
    const noPrepared = state.preparedItems.filter(p => !ids.includes(p.productId));
    const next = { ...state, products: noProducts, preparedItems: noPrepared };
    saveState(next);
    return next;
  }),

  setBudget: (val) => set((state) => {
    const next = { ...state, settings: { ...state.settings, defaultBudget: val } };
    saveState(next);
    return next;
  }),

  moveItem: (id, target, overId) => set((state) => {
    const pItems = [...state.preparedItems];
    const idx = pItems.findIndex(i => i.productId === id);
    const prod = state.products.find(p => p.id === id);

    if (target === 'assortment') {
      if (idx > -1) pItems.splice(idx, 1);
    } else if (target === 'prepared') {
      if (idx === -1 && prod) {
        const newItem = {
          id: generateId(),
          productId: id,
          qty: prod.targetQty || 1,
          orderIndex: pItems.length,
          estimatedUnitPrice: prod.priceHistory[0] || null,
          actualUnitPrice: null,
          picked: false
        };
        
        if (overId) {
          const overIdx = pItems.findIndex(i => i.productId === overId);
          if (overIdx > -1) {
            pItems.splice(overIdx, 0, newItem);
          } else {
            pItems.push(newItem);
          }
        } else {
          pItems.push(newItem);
        }
      }
    } else if (target === 'picked') {
      if (idx > -1) pItems[idx].picked = true;
    } else if (target === 'unpicked') {
      if (idx > -1) pItems[idx].picked = false;
    }

    const next = { ...state, preparedItems: pItems.map((item, index) => ({ ...item, orderIndex: index })) };
    saveState(next);
    return next;
  }),

  reorderProducts: (activeId, overId) => set((state) => {
    const oldIndex = state.products.findIndex(i => i.id === activeId);
    const newIndex = state.products.findIndex(i => i.id === overId);
    if (oldIndex < 0 || newIndex < 0) return state;
    
    const items = [...state.products];
    const [moved] = items.splice(oldIndex, 1);
    items.splice(newIndex, 0, moved);
    
    const next = { ...state, products: items.map((i, index) => ({ ...i, orderIndex: index })) };
    saveState(next);
    return next;
  }),

  reorderPrepared: (activeId, overId) => set((state) => {
    const oldIndex = state.preparedItems.findIndex(i => i.productId === activeId);
    const newIndex = state.preparedItems.findIndex(i => i.productId === overId);
    if (oldIndex < 0 || newIndex < 0) return state;
    
    const items = [...state.preparedItems];
    const [moved] = items.splice(oldIndex, 1);
    items.splice(newIndex, 0, moved);
    
    const next = { ...state, preparedItems: items.map((i, index) => ({ ...i, orderIndex: index })) };
    saveState(next);
    return next;
  }),

  updatePreparedQty: (id, newQty) => set((state) => {
    const qtys = state.preparedItems.map(p => p.productId === id ? { ...p, qty: newQty } : p);
    const next = { ...state, preparedItems: qtys };
    saveState(next);
    return next;
  }),

  updatePreparedPrice: (id, price, isActual) => set((state) => {
    const newItems = state.preparedItems.map(p => {
      if (p.productId === id) {
        return isActual ? { ...p, actualUnitPrice: price } : { ...p, estimatedUnitPrice: price };
      }
      return p;
    });

    const newProds = state.products.map(p => {
       if (p.id === id && price !== null) {
          const hist = [...p.priceHistory];
          if (hist[hist.length - 1] !== price) hist.push(price);
          return { ...p, priceHistory: hist };
       }
       return p;
    });

    const next = { ...state, preparedItems: newItems, products: newProds };
    saveState(next);
    return next;
  })
}));
