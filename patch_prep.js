const fs = require('fs');

let code = fs.readFileSync('src/presentation/pages/PreparationPage.tsx', 'utf-8');

// Add icons
code = code.replace(
  "import { GripVertical, Trash2 } from 'lucide-react';",
  "import { GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';"
);

// Add noPriceCount logic
code = code.replace(
  "let inZoneTotal = 0;\n  const itemsWithZone",
  "let inZoneTotal = 0;\n  let noPriceCount = 0;\n  const itemsWithZone"
);

code = code.replace(
  "const price = item.actualUnitPrice ?? item.estimatedUnitPrice ?? 0;",
  "const price = item.actualUnitPrice ?? item.estimatedUnitPrice;\n    if (price === null) noPriceCount++;\n    const cost = (price ?? 0) * item.qty;"
);

// Display noPriceCount
code = code.replace(
  "<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>\n            <span style={{ color: '#065f46' }}>В зоне: {inZoneTotal} RSD</span> \n            <span style={{ fontWeight: 'bold' }}>Остаток: {remaining} RSD</span>\n          </div>",
  `<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#065f46' }}>В зоне: {inZoneTotal} RSD</span> 
            <span style={{ fontWeight: 'bold' }}>Остаток: {remaining} RSD</span>
          </div>
          {noPriceCount > 0 && <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>Без цены: {noPriceCount} поз.</div>}`
);

// Delete icon logic for prep list (Clear All)
code = code.replace(
  "<button className=\"btn-icon\"><Trash2 size={20} /></button>",
  "<button className=\"btn-icon\" onClick={() => { if(window.confirm('Очистить список к покупке?')) setupItems.forEach(i => store.moveItem(i.productId, 'assortment')) }}><Trash2 size={20} /></button>"
);

// Add clear all for assortment? No, remove the empty trash in Assortment panel.
// Actually, assortment might not need trash.
code = code.replace(
  "<div className=\"toolbar-actions\">\n              <button className=\"btn-icon\"><Trash2 size={20} /></button>        \n            </div>",
  ""
);

// Add quick move arrows in prep-list
code = code.replace(
  "{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}\n                  </span>",
  `{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}
                  </span>
                  <button className="btn-icon" onClick={() => store.moveItem(productId, 'assortment')} style={{marginLeft:'auto'}}><ArrowDown size={18}/></button>`
);

// Add quick move arrows in assortment
code = code.replace(
  "{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}\n                  </span>",
  `{prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}
                  </span>
                  <button className="btn-icon" onClick={() => store.moveItem(prod.id, 'prepared')} style={{marginLeft:'auto'}}><ArrowUp size={18}/></button>`
);

fs.writeFileSync('src/presentation/pages/PreparationPage.tsx', code);
