const fs = require('fs');
const content = `import React, { useState } from 'react';
import { useStore } from '../../application/store';
import { DndContext, PointerSensor, closestCorners, DragOverlay, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';        

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

export const PreparationPage = () => {
  const store = useStore();
  const budget = store.settings.defaultBudget;
  const setBudget = store.setBudget;
  const assortment = store.products.filter(p => !store.preparedItems.some(i => i.productId === p.id));
  const setupItems = store.preparedItems;

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  let remaining = budget;
  let inZoneTotal = 0;
  let noPriceCount = 0;
  const itemsWithZone = setupItems.map(item => {
    const prod = store.products.find(p => p.id === item.productId);
    const price = item.actualUnitPrice ?? item.estimatedUnitPrice;
    if (price === null) noPriceCount++;
    const cost = (price ?? 0) * item.qty;
    const inZone = cost <= remaining;
    if (inZone) { remaining -= cost; inZoneTotal += cost; }
    return { ...item, prod, inZone, cost };
  });

  const onDragEnd = (e: any) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const isFromAssortment = assortment.some(p => p.id === active.id);
    const isToAssortment = over.id === 'assortment-list' || assortment.some(p => p.id === over.id);
    const isFromPrep = setupItems.some(i => i.productId === active.id);
    const isToPrep = over.id === 'prep-list' || setupItems.some(i => i.productId === over.id);

    if (isFromAssortment && isToPrep) {
      store.moveItem(active.id as string, 'prepared', over.id !== 'prep-list' ? over.id as string : undefined);
    } else if (isFromPrep && isToAssortment) {
      store.moveItem(active.id as string, 'assortment');
    } else if (isFromPrep && isToPrep && active.id !== over.id) {
      store.reorderPrepared(active.id as string, over.id as string);
    } else if (isFromAssortment && isToAssortment && active.id !== over.id) {   
      store.reorderProducts(active.id as string, over.id as string);
    }
  };

  const handleGlobalClear = () => {
    if(window.confirm('Очистить список к покупке и удалить весь ассортимент?')) {
      store.deleteProducts(store.products.map(p => p.id));
    }
  };

  return (
    <main className="tab-content">
      <section className="panel" style={{marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0}}>
        <div className="panel-toolbar" style={{marginBottom: '12px'}}>
          <h2 className="panel-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            Бюджет: 
            <input className="field field-sm" type="number" value={budget} onChange={(e) => setBudget(parseFloat(e.target.value) || 0)} style={{ width: '80px', margin: 0 }} />
            RSD
          </h2>
          <button className="btn-icon danger" onClick={handleGlobalClear}><Trash2 size={20} /></button>
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
            <div id="prep-list" style={{minHeight: '20px'}}>
              <SortableContext items={setupItems.map(i => i.productId)} strategy={verticalListSortingStrategy}>
                {itemsWithZone.map(({ productId, qty, prod, inZone }) => prod ? ( 
                  <SortableRow key={productId} id={productId} className={inZone ? 'zone-covered' : 'zone-out'}>
                    <InlineEdit value={prod.name} onChange={val => store.updateProduct(productId, { name: val })} autoFocus={prod.name === ''}/>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{qty} {prod.unit === 'pieces' ? 'шт' : prod.unit === 'bottles' ? 'бут' : 'уп'}</span>  
                    <span style={{ marginLeft: '4px', color: '#64748b', fontSize: '0.8rem', width: '40px', textAlign: 'right' }}>
                      {prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}    
                    </span>
                    <button className="btn-icon" style={{ marginLeft: '8px', padding: '4px' }} onClick={() => store.moveItem(productId, 'assortment')}><ArrowDown size={18} /></button>
                  </SortableRow>
                ) : null)}
              </SortableContext>
            </div>

            <div className="list-header" style={{fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', padding: '16px 8px 6px'}}>Ассортимент</div>
            <div id="assortment-list" style={{minHeight: '20px'}}>
              <SortableContext items={assortment.map(p => p.id)} strategy={verticalListSortingStrategy}>
                {assortment.map(prod => (
                  <SortableRow key={prod.id} id={prod.id}>
                    <InlineEdit value={prod.name} onChange={val => store.updateProduct(prod.id, { name: val })} autoFocus={prod.name === ''}/>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{prod.targetQty} {prod.unit === 'pieces' ? 'шт' : prod.unit === 'bottles' ? 'бут' : 'уп'}</span>
                    <span style={{ marginLeft: '4px', color: '#64748b', fontSize: '0.8rem', width: '40px', textAlign: 'right' }}>
                      {prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}    
                    </span>
                    <button className="btn-icon" style={{ marginLeft: '8px', padding: '4px' }} onClick={() => store.moveItem(prod.id, 'prepared')}><ArrowUp size={18} /></button>
                  </SortableRow>
                ))}
              </SortableContext>
            </div>

            <div style={{padding: '12px 0 4px', display: 'flex', justifyContent: 'center'}}>
              <button 
                className="btn-icon" 
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', color: '#475569' }} 
                onClick={() => {
                  store.addProduct({ name: '', targetQty: 1, unit: 'pieces', priceHistory: [] });
                }}
              >
                <Plus size={24} />
              </button>
            </div>

          </div>
        </section>

        <DragOverlay>
          {activeId ? (
             <div className="line-row dragging" style={{ background: '#fff' }}> 
                <button type="button" className="drag-handle"><GripVertical size={18} /></button>
                <span className="row-name static" style={{ flex: 1, padding: '4px 6px', fontWeight: 600 }}>
                  {store.products.find(p => p.id === activeId)?.name || '...'}
                </span>
             </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
};
`
fs.writeFileSync('src/presentation/pages/PreparationPage.tsx', content);
