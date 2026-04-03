const fs = require('fs');

let code = fs.readFileSync('src/application/store.ts', 'utf-8');

code = code.replace(
  "  reorderPrepared: (activeId: string, overId: string) => void;\n}",
  `  reorderPrepared: (activeId: string, overId: string) => void;
  deletedBackup: { products: Product[], preparedItems: any[] } | null;
  undoDelete: () => void;
  completePurchases: () => void;
  restoreFromHistory: (historyId: string) => void;
}`
);

fs.writeFileSync('src/application/store.ts', code);
