const fs = require('fs');

let t = fs.readFileSync('src/domain/types.ts', 'utf8');
t = t.replace("type Unit = 'pieces' | 'bottles' | 'packs';", "export type Unit = 'pieces' | 'bottles' | 'packs';");
fs.writeFileSync('src/domain/types.ts', t);

let c = fs.readFileSync('src/presentation/pages/CatalogPage.tsx', 'utf8');
c = c.replace(/<option value="liters">Литры<\/option>/g, '<option value="bottles">Бутылки</option>');
c = c.replace(/<option value="grams">Граммы<\/option>/g, '<option value="packs">Пачки</option>');
c = c.replace(/<option value="liters">Л<\/option>/g, '<option value="bottles">Бут</option>');
c = c.replace(/<option value="grams">Г<\/option>/g, '<option value="packs">Уп</option>');

fs.writeFileSync('src/presentation/pages/CatalogPage.tsx', c);
