const fs = require('fs');
let code = fs.readFileSync('src/presentation/pages/PreparationPage.tsx', 'utf-8');

code = code.replace(
  "const price = item.actualUnitPrice ?? item.estimatedUnitPrice ?? 0;\n    const cost = price * item.qty;",
  "const price = item.actualUnitPrice ?? item.estimatedUnitPrice;\n    if (price === null) noPriceCount++;\n    const cost = (price ?? 0) * item.qty;"
);

code = code.replace(
  "<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>\n            <span style={{ color: '#065f46' }}>В зоне: {inZoneTotal} RSD</span> \n            <span style={{ fontWeight: 'bold' }}>Остаток: {remaining} RSD</span>\n          </div>",
  `<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#065f46' }}>В зоне: {inZoneTotal} RSD</span> 
            <span style={{ fontWeight: 'bold' }}>Остаток: {remaining} RSD</span>
          </div>
          {noPriceCount > 0 && <div style={{ fontSize: '0.85rem', color: '#b91c1c', marginTop: '4px' }}>Без цены: {noPriceCount} поз.</div>}`
);

code = code.replace(
  "{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}\n                  </span>\n                </SortableRow>",
  `{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}    
                  </span>
                  <button className="btn-icon" onClick={() => store.moveItem(productId, 'assortment')} style={{marginLeft: 'auto'}}><ArrowDown size={18}/></button>
                </SortableRow>`
);

code = code.replace(
  "{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}\n                  </span>\n                </SortableRow>",
  `{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}    
                  </span>
                  <button className="btn-icon" onClick={() => store.moveItem(prod.id, 'prepared')} style={{marginLeft: 'auto'}}><ArrowUp size={18}/></button>
                </SortableRow>`
);

code = code.replace(
  "<div className=\"toolbar-actions\">\n              <button className=\"btn-icon\"><Trash2 size={20} /></button>        \n            </div>",
  `<div className="toolbar-actions">
              <button className="btn-icon" onClick={() => { if(window.confirm('Очистить список?')) { setupItems.forEach(i => store.moveItem(i.productId, 'assortment')); } }}><Trash2 size={20} /></button>
            </div>`
);

code = code.replace(
  "<div className=\"toolbar-actions\">\n              <button className=\"btn-icon\"><Trash2 size={20} /></button>        \n            </div>",
  `<div className="toolbar-actions">
              <button className="btn-icon" onClick={() => { if(window.confirm('Очистить весь ассортимент?')) { store.deleteProducts(store.products.map(p => p.id)); } }}><Trash2 size={20} /></button>
            </div>`
);


fs.writeFileSync('src/presentation/pages/PreparationPage.tsx', code);
