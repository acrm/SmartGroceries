const fs = require('fs');

for (const file of ['src/presentation/pages/PreparationPage.tsx', 'src/presentation/pages/CatalogPage.tsx', 'src/presentation/pages/StorePage.tsx']) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/if\s*\(\s*window\.confirm\([^)]+\)\s*\)\s*\{([^}]+)\}/g, '$1');
    content = content.replace(/if\s*\(\s*window\.confirm\([^)]+\)\s*\)\s*(store\.[^;]+;)/g, '$1');
    fs.writeFileSync(file, content);
}
