const fs = require('fs');
let cat = fs.readFileSync('src/presentation/pages/CatalogPage.tsx', 'utf-8');

// Replace handlePriceClick explicitly
const startStr = 'const handlePriceClick = (prod: any) => {';
const startIdx = cat.indexOf(startStr);
if (startIdx !== -1) {
  let endIdx = cat.indexOf('};', startIdx);
  while (endIdx !== -1 && endIdx < cat.length) {
    const chunk = cat.substring(startIdx, endIdx + 2);
    if (chunk.includes('store.updateProduct') || chunk.includes('updateProduct')) {
      cat = cat.substring(0, startIdx) + cat.substring(endIdx + 2);
      break;
    }
    endIdx = cat.indexOf('};', endIdx + 2);
  }
}

// Fix 'store.' reference that got added in the JSX because in CatalogPage Zunstand returns unpacked functions.
cat = cat.replace('store.updateProduct(product.id, { priceHistory:', 'updateProduct(product.id, { priceHistory:');

fs.writeFileSync('src/presentation/pages/CatalogPage.tsx', cat);
