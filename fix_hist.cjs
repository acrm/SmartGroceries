const fs = require('fs');
let hist = fs.readFileSync('src/presentation/pages/HistoryPage.tsx', 'utf-8');
hist = hist.replace(/if\s*\(\s*window\.confirm\([^)]+\)\s*\)\s*/g, '');
fs.writeFileSync('src/presentation/pages/HistoryPage.tsx', hist);
