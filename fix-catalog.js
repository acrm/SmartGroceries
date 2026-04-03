const fs = require('fs');
let code = fs.readFileSync('src/presentation/pages/CatalogPage.tsx', 'utf8');

// Remove the top panel completely
code = code.replace(/<section className="panel">\s*<h2 className="panel-title">Добавить товар<\/h2>[\s\S]*?<\/section>\s*/, '');

// Append the inline add row to the list (just before the closing </div> of the list, or in the empty state section if empty)
// Wait, doing this via regex might be brittle. I will just rewrite it to use sed or do it manually.
