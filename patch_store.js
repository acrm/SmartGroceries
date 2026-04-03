const fs = require('fs');

let code = fs.readFileSync('src/application/store.ts', 'utf-8');

// Add new State properties and methods
code = code.replace(
  "reorderPrepared: (activeId: string, overId: string) => void;",
  `reorderPrepared: (activeId: string, overId: string) => void;
  deletedBackup: { products: Product[], preparedItems: PreparedItem[] } | null;
  undoDelete: () => void;
  completePurchases: () => void;
  restoreFromHistory: (historyId: string) => void;`
);

// Add initial State
code = code.replace(
  "activeTab: 'catalog',",
  "activeTab: 'catalog',\n  deletedBackup: null,"
);

// Update deleteProducts to save backup
code = code.replace(
  `deleteProducts: (ids) => set((state) => {
    const noProducts = state.products.filter(p => !ids.includes(p.id));
    const noPrepared = state.preparedItems.filter(p => !ids.includes(p.productId));
    const next = { ...state, products: noProducts, preparedItems: noPrepared }; 
    saveState(next);
    return next;
  }),`,
  `deleteProducts: (ids) => set((state) => {
    const deletedProds = state.products.filter(p => ids.includes(p.id));
    const deletedPrep = state.preparedItems.filter(p => ids.includes(p.productId));
    const noProducts = state.products.filter(p => !ids.includes(p.id));
    const noPrepared = state.preparedItems.filter(p => !ids.includes(p.productId));
    const next = { ...state, products: noProducts, preparedItems: noPrepared, deletedBackup: { products: deletedProds, preparedItems: deletedPrep } };
    saveState(next);
    return next;
  }),
  
  undoDelete: () => set((state) => {
    if (!state.deletedBackup) return state;
    const next = {
      ...state,
      products: [...state.products, ...state.deletedBackup.products].sort((a,b) => a.orderIndex - b.orderIndex),
      preparedItems: [...state.preparedItems, ...state.deletedBackup.preparedItems].sort((a,b) => a.orderIndex - b.orderIndex),
      deletedBackup: null
    };
    saveState(next);
    return next;
  }),`
);

// Add completePurchases and restoreFromHistory
code = code.replace(
  `updatePreparedPrice: (id, price, isActual) => `,
  `completePurchases: () => set((state) => {
    const picked = state.preparedItems.filter(i => i.picked);
    if (picked.length === 0) return state;
    
    let totalSpent = 0;
    const historyItems = [];
    const newProducts = [...state.products];
    
    picked.forEach(item => {
      const prodIdx = newProducts.findIndex(p => p.id === item.productId);
      if (prodIdx === -1) return;
      const prod = newProducts[prodIdx];
      const actual = item.actualUnitPrice ?? 0;
      const total = actual * item.qty;
      totalSpent += total;
      
      historyItems.push({
        id: generateId(),
        productId: item.productId,
        productName: prod.name,
        unit: prod.unit,
        qty: item.qty,
        estimatedUnitPrice: item.estimatedUnitPrice,
        actualUnitPrice: item.actualUnitPrice,
        total
      });
      
      if (item.actualUnitPrice !== null) {
        const hist = [...prod.priceHistory];
        if (hist[hist.length - 1] !== item.actualUnitPrice) hist.push(item.actualUnitPrice);
        newProducts[prodIdx] = { ...prod, priceHistory: hist };
      }
    });
    
    const session = {
      id: generateId(),
      completedAt: new Date().toISOString(),
      budget: state.settings.defaultBudget,
      items: historyItems
    };
    
    const next = {
      ...state,
      history: [session, ...state.history],
      preparedItems: state.preparedItems.filter(i => !i.picked),
      products: newProducts,
      activeTab: 'history' as any
    };
    saveState(next);
    return next;
  }),
  
  restoreFromHistory: (historyId) => set((state) => {
    const session = state.history.find(h => h.id === historyId);
    if (!session) return state;
    
    const pItems = [...state.preparedItems];
    session.items.forEach(hItem => {
      const existing = pItems.find(p => p.productId === hItem.productId);
      if (!existing) {
        pItems.push({
          id: generateId(),
          productId: hItem.productId,
          qty: hItem.qty,
          orderIndex: pItems.length,
          estimatedUnitPrice: hItem.actualUnitPrice ?? hItem.estimatedUnitPrice,
          actualUnitPrice: null,
          picked: false
        });
      }
    });
    const next = { ...state, preparedItems: pItems, activeTab: 'preparation' as any };
    saveState(next);
    return next;
  }),
  
  updatePreparedPrice: (id, price, isActual) => `
);

fs.writeFileSync('src/application/store.ts', code);
