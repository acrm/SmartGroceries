const fs = require('fs');
let code = fs.readFileSync('src/application/store.ts', 'utf-8');

code = code.replace(
  `  deleteProducts: (ids) => set((state) => {
    const noProducts = state.products.filter(p => !ids.includes(p.id));
    const noPrepared = state.preparedItems.filter(p => !ids.includes(p.productId));
    const next = { ...state, products: noProducts, preparedItems: noPrepared }; 
    saveState(next);
    return next;
  }),`,
  `  deleteProducts: (ids) => set((state) => {
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

fs.writeFileSync('src/application/store.ts', code);
