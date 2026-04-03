const fs = require('fs');

let cat = fs.readFileSync('src/presentation/pages/CatalogPage.tsx', 'utf-8');

const comp = `
const InlinePriceEdit = ({ value, onChange, rangeText }: {value: number, onChange: (v: number) => void, rangeText: string}) => {
   const [editing, setEditing] = useState(false);
   const [val, setVal] = useState(value.toString());
   
   if (editing) {
      return (
         <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '4px', padding: '2px' }}>
            <button className="counter-btn" onClick={() => onChange(Math.max(0, parseInt(val || '0') - 1))}>-</button>   
            <input 
               type="number" 
               autoFocus
               min={0}
               value={val}
               onChange={e => setVal(e.target.value)}
               onBlur={() => {
                  setEditing(false);
                  onChange(parseInt(val || '0'));
               }}
               onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
               style={{width: '40px', border: 'none', background: 'transparent', textAlign: 'center', outline: 'none', fontSize: '0.85rem', fontWeight: 'bold', padding: 0}}
            />
            <button className="counter-btn" onClick={() => onChange(parseInt(val || '0') + 1)}>+</button>
         </div>
      );
   }

   return (
      <div 
         onClick={(e) => {
            e.stopPropagation();
            setVal(value.toString());
            setEditing(true);
         }} 
         style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', minWidth: '40px', justifyContent: 'flex-end', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569'}}
         title="Click to edit price"
      >
         {rangeText || '-'}
      </div>
   );
};
`;

cat = cat.replace(/const InlineEdit = /, comp + '\nconst InlineEdit = ');

// Then remove handlePriceClick definition
cat = cat.replace(/const handlePriceClick = \([^)]+\) => \{[\s\S]*?store\.updateProduct\([^;]+;\s*\};\s*};\s*/, '');

// Then replace the JSX that calls handlePriceClick
cat = cat.replace(
  /<div onClick=\{[^\}]+\} style=\{\{[^\}]+\}\}>\s*\{formatPriceRange\(product\.priceHistory\)\}\s*<\/div>/,
  `{(() => {
     const currentPrice = product.priceHistory[product.priceHistory.length - 1] ?? 0;
     return (
        <InlinePriceEdit 
           value={currentPrice} 
           rangeText={formatPriceRange(product.priceHistory)}
           onChange={(newVal) => store.updateProduct(product.id, { priceHistory: [...product.priceHistory, newVal] })} 
        />
     )
  })()}`
);

fs.writeFileSync('src/presentation/pages/CatalogPage.tsx', cat);
