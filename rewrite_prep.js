const fs = require('fs');

let content = fs.readFileSync('src/presentation/pages/PreparationPage.tsx', 'utf-8');

// remove window.confirm in clear 
content = content.replace(/if\s*\(window\.confirm\([^)]+\)\)\s*\{([^}]+)\}/, '$1');

// also move the trash icon if it is outside the list header
// well, it's easier to just do a string replace on the HTML part

fs.writeFileSync('src/presentation/pages/PreparationPage.tsx', content);
