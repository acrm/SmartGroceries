const fs = require('fs');
let code = fs.readFileSync('src/presentation/pages/PreparationPage.tsx', 'utf-8');

code = code.replace(
  "{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}\n                  </span>\n                </SortableRow>",
  `{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}
                  </span>
                  <button className="btn-icon" onClick={() => store.moveItem(productId, 'assortment')} style={{marginLeft:'auto'}}><ArrowDown size={18}/></button>
                </SortableRow>`
);

code = code.replace(
  "{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}\n                  </span>\n                </SortableRow>",
  `{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}
                  </span>
                  <button className="btn-icon" onClick={() => store.moveItem(prod.id, 'prepared')} style={{marginLeft:'auto'}}><ArrowUp size={18}/></button>
                </SortableRow>`
);

fs.writeFileSync('src/presentation/pages/PreparationPage.tsx', code);
