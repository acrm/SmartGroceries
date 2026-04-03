const fs = require('fs');
let content = fs.readFileSync('src/presentation/pages/PreparationPage.tsx', 'utf-8');

// Replace the div with the new flex header containing Trash2
content = content.replace(
  /<div className="list-header" style=\{\{fontSize: '0\.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', padding: '12px 8px 6px'\}\}>К покупке<\/div>/g,
  `<div className="list-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 8px 6px', background: '#fff', borderBottom: '1px solid #f1f5f9'}}>
       <span style={{fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold'}}>К покупке</span>
       <button className="btn-icon danger" onClick={() => store.deleteProducts(store.preparedItems.map(i => i.productId))} style={{padding: 0}}><Trash2 size={16} /></button>
   </div>`
);

content = content.replace(
  /<div className="list-header" style=\{\{fontSize: '0\.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', padding: '16px 8px 6px'\}\}>Ассортимент<\/div>/g,
  `<div className="list-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 8px 6px', background: '#fff', borderBottom: '1px solid #f1f5f9', borderTop: '1px solid #f1f5f9'}}>
       <span style={{fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold'}}>Ассортимент</span>
   </div>`
);

fs.writeFileSync('src/presentation/pages/PreparationPage.tsx', content);
