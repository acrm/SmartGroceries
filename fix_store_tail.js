const fs = require('fs');
let code = fs.readFileSync('src/application/store.ts', 'utf-8');

if (code.includes('updatePreparedPrice: (id, price, isActual) => set((state) => {') && !code.includes('restoreFromHistory')) {
  // Let's replace the last `  })\n}));` or similar to append the missing functions.
  code = code.replace(/}\);\s*const next = { \.\.\.state, preparedItems: newItems, products: newProds };\s*saveState\(next\);\s*return next;\s*}\)\s*}\)\);/s,
  `});
    const next = { ...state, preparedItems: newItems, products: newProds };
    saveState(next);
    return next;
  }),
  
  completePurchases: () => set((state) => {
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
        id: Math.random().toString(36).substring(2),
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
      id: Math.random().toString(36).substring(2),
      completedAt: new Date().toISOString(),
      budget: state.settings.defaultBudget,
      items: historyItems,
      totalSpent
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
          id: Math.random().toString(36).substring(2),
          productId: hItem.productId,
          qty: hItem.qty,
          orderIndex: pItems.length,
          estimatedUnitPrice: hItem.actualUnitPrice ?? hItem.estimatedUnitPrice,
          actualUnitPrice: null,
          picked: false
        });
      }
    });
    const next = { ...state, preparedItems: pItems.map((item, index) => ({ ...item, orderIndex: index })), activeTab: 'preparation' as any };
    saveState(next);
    return next;
  })
}));`
  );
  
  fs.writeFileSync('src/application/store.ts', code);
}
