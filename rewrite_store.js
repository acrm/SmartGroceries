const fs = require('fs');
const content = `import React, { useState } from 'react';
import { useStore } from '../../application/store';
import { DndContext, PointerSensor, closestCorners, DragOverlay, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ArrowDown, ArrowUp, Plus } from 'lucide-react';        

const InlineEdit = ({ value, onChange, autoFocus }: {value: string, onChange: (v: string) => void, autoFocus?: boolean}) => {
  const [val, setVal] = useState(value);
  return <input 
    type="text" 
    autoFocus={autoFocus}
    value={val} 
    onChange={e => setVal(e.target.value)} 
    onBlur={() => onChange(val)} 
    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
    style={{flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '0 4px', margin: 0, color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', minWidth: '50px'}}
  />;
}

const SortableRow = ({ id, children, className }: {id: string, children: React.ReactNode, className?: string}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };   
  return (
    <div ref={setNodeRef} style={style} className={\`line-row sortable-row\${isDragging ? ' dragging' : ''}\${className ? ' ' + className : ''}\`}>
      <button type="button" className="drag-handle" ref={setActivatorNodeRef} {...attributes} {...listeners}>
        <GripVertical size={18} />
      </button>
      {children}
    </div>
  );
};

export const StorePage = () => {
  const store = useStore();
  const unpicked = store.preparedItems.filter(i => !i.picked);
  const picked = store.preparedItems.filter(i => i.picked);

  const budget = store.settings.defaultBudget;
  let spent = picked.reduce((acc, item) => acc + (item.actualUnitPrice ?? 0) * item.qty, 0);

  // In zone calculation for StorePage (unpicked)
  let remaining = budget - spent;
  let noPriceCount = 0;
  let inZoneTotal = 0;
  
  const setupItems = store.preparedItems;
  setupItems.filter(i => !i.picked).forEach(item => {
    const price = item.actualUnitPrice ?? item.estimatedUnitPrice;
    if (price === null) noPriceCount++;
    const cost = (price ?? 0) * item.qty;
    if (cost <= remaining) {
      remaining -= cost;
      inZoneTotal += cost;
    }
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handlePriceClick = (prod: any, item: any) => {
    let current = item.actualUnitPrice ?? item.estimatedUnitPrice ?? 0;
    const res = window.prompt(\`Цена для \${prod.name}\\nТекущая: \${current}\\nВведите новую или +/- (например +50 или -20)\`, '');
    if (!res) return;
    const trimmed = res.trim();
    let computed = current;
    if (trimmed.startsWith('+')) {
      computed += parseFloat(trimmed.slice(1)) || 0;
    } else if (trimmed.startsWith('-')) {
      computed = Math.max(0, computed - (parseFloat(trimmed.slice(1)) || 0));
    } else {
      const val = parseFloat(trimmed);
      if (!isNaN(val) && val >= 0) computed = val;
    }
    store.updatePreparedPrice(prod.id, computed, true);
  };

  const onDragEnd = (e: any) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const isUnpicked = unpicked.some(i => i.productId === active.id);
    const isPicked = picked.some(i => i.productId === active.id);

    if (isUnpicked && (over.id === 'picked-list' || picked.some(i => i.productId === over.id))) {
      store.moveItem(active.id as string, 'picked');
    } else if (isPicked && (over.id === 'unpicked-list' || unpicked.some(i => i.productId === over.id))) {
      store.moveItem(active.id as string, 'unpicked');
    } else if (isUnpicked && active.id !== over.id) {
      store.reorderPrepared(active.id as string, over.id as string);
    } else if (isPicked && active.id !== over.id) {
      store.reorderPrepared(active.id as string, over.id as string);
    }
  };

  const handleEmptyAdd = () => {
    store.addProduct({ name: '', targetQty: 1, unit: 'pieces', priceHistory: [] });
    // The product will go to Assortment implicitly because it's not in prepared Items yet.
    // If they click + here, we want it instantly in "unpicked". We must find the newest product ID and move it.
    // However, store.addProduct adds to the end. The cleanest way is to dispatch the side effect next render hook
    // or just let them add on PreparationPage. But since we need an Add here:
    setTimeout(() => {
       const state = useStore.getState();
       const newProd = state.products[state.products.length - 1];
       if (newProd) state.moveItem(newProd.id, 'prepared');
    }, 50);
  };

  return (
    <main className="tab-content">
      <section className="panel" style={{marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0}}>
        <div className="panel-toolbar" style={{marginBottom: '12px'}}>
          <h2 className="panel-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            Бюджет: {budget} RSD
          </h2>
        </div>
        <div className="budget-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.9rem', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <span>В зоне/остаток:</span>
            <span>{inZoneTotal} /</span>
            <span style={{ color: remaining < 0 ? '#dc2626' : '#059669', fontWeight: 'bold' }}>
              {remaining} RSD {remaining < 0 && '(перебор)'}
            </span>
          </div>
          {noPriceCount > 0 && <div style={{ fontSize: '0.85rem', color: '#ea580c' }}>Без цены: {noPriceCount} шт. в зоне</div>}
        </div>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={e => setActiveId(e.active.id as string)} onDragEnd={onDragEnd}>
        <section className="panel" style={{borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0}}>
          <div className="list continuous-list">
            
            <div className="list-header" style={{fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', padding: '12px 8px 6px'}}>К покупке</div>
            <div id="unpicked-list" style={{minHeight: '20px'}}>
             <SortableContext items={unpicked.map(i => i.productId)} strategy={verticalListSortingStrategy}>
               {unpicked.map(item => {
                 const prod = store.products.find(p => p.id === item.productId);
                 if (!prod) return null;
                 
                 const pPrice = item.actualUnitPrice ?? item.estimatedUnitPrice;
                 const inZone = pPrice !== null && (pPrice * item.qty) <= remaining + (pPrice * item.qty);

                 return (
                   <SortableRow key={item.productId} id={item.productId} className={inZone ? 'zone-covered' : 'zone-out'}>       
                     <InlineEdit value={prod.name} onChange={val => store.updateProduct(prod.id, { name: val })} autoFocus={prod.name === ''}/>
                     <span style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{item.qty} {prod.unit === 'pieces' ? 'шт' : prod.unit === 'bottles' ? 'бут' : 'уп'}</span>
                     <div 
                        onClick={() => handlePriceClick(prod, item)} 
                        style={{ marginLeft: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2'}}
                     >
                        {item.actualUnitPrice !== null && item.estimatedUnitPrice !== null && item.actualUnitPrice !== item.estimatedUnitPrice && (
                           <span style={{textDecoration: 'line-through', fontSize: '0.7rem', color: '#94a3b8'}}>{item.estimatedUnitPrice}</span>
                        )}
                        <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#475569'}}>{pPrice ?? '?'}</span>
                     </div>
                     <button className="btn-icon" onClick={() => store.moveItem(item.productId, 'picked')} style={{ marginLeft: '12px', padding: '4px' }}><ArrowDown size={18}/></button>
                   </SortableRow>
                 )
               })}
             </SortableContext>
            </div>

            <div className="list-header" style={{fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', padding: '16px 8px 6px'}}>В корзине</div>
            <div id="picked-list" style={{minHeight: '20px'}}>
             <SortableContext items={picked.map(i => i.productId)} strategy={verticalListSortingStrategy}>
               {picked.map(item => {
                 const prod = store.products.find(p => p.id === item.productId);
                 if (!prod) return null;
                 const pPrice = item.actualUnitPrice ?? item.estimatedUnitPrice;
                 return (
                   <SortableRow key={item.productId} id={item.productId} className="zone-covered">
                     <InlineEdit value={prod.name} onChange={val => store.updateProduct(prod.id, { name: val })} autoFocus={prod.name === ''}/>
                     <span style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{item.qty} {prod.unit === 'pieces' ? 'шт' : prod.unit === 'bottles' ? 'бут' : 'уп'}</span>
                     <div 
                        onClick={() => handlePriceClick(prod, item)} 
                        style={{ marginLeft: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2'}}
                     >
                        {item.actualUnitPrice !== null && item.estimatedUnitPrice !== null && item.actualUnitPrice !== item.estimatedUnitPrice && (
                           <span style={{textDecoration: 'line-through', fontSize: '0.7rem', color: '#94a3b8'}}>{item.estimatedUnitPrice}</span>
                        )}
                        <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a'}}>{pPrice ?? '?'}</span>
                     </div>
                     <button className="btn-icon" onClick={() => store.moveItem(item.productId, 'unpicked')} style={{ marginLeft: '12px', padding: '4px' }}><ArrowUp size={18}/></button>
                   </SortableRow>
                 )
               })}
             </SortableContext>
            </div>

            <div style={{padding: '12px 0 4px', display: 'flex', justifyContent: 'center'}}>
              <button 
                className="btn-icon" 
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', color: '#475569' }} 
                onClick={handleEmptyAdd}
              >
                <Plus size={24} />
              </button>
            </div>

          </div>
        </section>

        <DragOverlay>
           {activeId ? <div className="line-row dragging" style={{ background: '#fff' }}><button className="drag-handle"><GripVertical size={18}/></button><span className="row-name static" style={{flex: 1}}>{store.products.find(p => p.id === activeId)?.name || '...'}</span></div> : null}
        </DragOverlay>
      </DndContext>

      {picked.length > 0 && (
         <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => { if(window.confirm('Сохранить в историю и очистить список?')) store.completePurchases() }}>Завершить покупки</button>
      )}
    </main>
  );
};
`
fs.writeFileSync('src/presentation/pages/StorePage.tsx', content);
