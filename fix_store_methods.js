const fs = require('fs');
let code = fs.readFileSync('src/application/store.ts', 'utf-8');

if (!code.includes("undoDelete: () => set")) {
   code = code.replace(
      "deleteProducts: (ids) => set((state) => {",
      `undoDelete: () => set((state) => {
    if (!state.deletedBackup) return state;
    const next = {
      ...state,
      products: [...state.products, ...state.deletedBackup.products].sort((a,b) => a.orderIndex - b.orderIndex),
      preparedItems: [...state.preparedItems, ...state.deletedBackup.preparedItems].sort((a,b) => a.orderIndex - b.orderIndex),
      deletedBackup: null
    };
    saveState(next);
    return next;
  }),
  deleteProducts: (ids) => set((state) => {`
   );
}
fs.writeFileSync('src/application/store.ts', code);
