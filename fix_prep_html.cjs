const fs = require('fs');
let content = fs.readFileSync('src/presentation/pages/PreparationPage.tsx', 'utf-8');

// Remove the global clear button from the top budget header
content = content.replace(/<button[^>]+onClick=\{handleGlobalClear\}[^>]*>.*?<\/button>/s, '');

// Into the list header for "К покупке":
content = content.replace(/(<span[^>]*>К покупке<\/span>)/, '$1\n               <button className="btn-icon danger" onClick={handleGlobalClear} style={{padding: 0}}><Trash2 size={16} /></button>');

fs.writeFileSync('src/presentation/pages/PreparationPage.tsx', content);

let catalogContent = fs.readFileSync('src/presentation/pages/CatalogPage.tsx', 'utf-8');
catalogContent = catalogContent.replace(/<h2 className="panel-title" style=\{\{display: 'flex', alignItems: 'center', gap: '8px'\}\}>\s*Каталог товаров\s*<\/h2>\s*<button className="btn-icon danger"[^>]*>.*?<\/button>/s, `<h2 className="panel-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>Каталог товаров</h2>`);
catalogContent = catalogContent.replace(/(<span[^>]*>По алфавиту<\/span>)/, '$1\n               <button className="btn-icon danger" onClick={handleGlobalClear} style={{padding: 0}}><Trash2 size={16} /></button>');
fs.writeFileSync('src/presentation/pages/CatalogPage.tsx', catalogContent);
