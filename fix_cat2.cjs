const fs = require('fs');

let cat = fs.readFileSync('src/presentation/pages/CatalogPage.tsx', 'utf-8');

cat = cat.replace('store.updateProduct(', 'updateProduct(');
cat = cat.replace(/const handlePriceClick = \([^)]+\) => \{[\s\S]*?if \(!res\) return;[\s\S]*?computed = Math\.max\(0, computed - \(parseFloat\(trimmed\.slice\(1\)\) \|\| 0\)\);[\s\S]*?\} else \{[\s\S]*?computed = parseFloat\(trimmed\);[\s\S]*?\}[\s\S]*?if \(isNaN\(computed\)\) return;[\s\S]*?updateProduct[^\}]+\};/m, '');

fs.writeFileSync('src/presentation/pages/CatalogPage.tsx', cat);
