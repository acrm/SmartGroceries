const fs = require('fs');

const content = `import React, { useState } from 'react';
import { useStore } from '../../application/store';
import { Trash2, GripVertical, Check, Plus } from 'lucide-react';
import { DndContext, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const InlineEdit = ({ value, onChange, autoFocus }: {value: string, onChange: (v: string) => void, autoFocus?: boolean}) => {
  const [val, setVal] = useState(value);
  return <input 
    type="text" 
    autoFocus={autoFocus}
    value={val} 
    onChange={e => setVal(e.target.value)} 
    onBlur={() => onChange(val)} 
    onKeyDown={e => { if(e.key === 'Enter') e.currentTarget.blur() }}
    style={{flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '0 4px', margin: 0, color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', minWidth: '50px'}}
  />;
}

const SortableRow = ({ id, children }: {id: string, children: React.ReactNode}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={\`line-row sortable-row\${isDragging ? ' dragging' : ''}\`}>
      <button type="button" className="drag-handle" ref={setActivatorNodeRef} {...attributes} {...listeners}>
        <GripVertical size={18} />
      </button>
      {children}
    </div>
  );
};

export const CatalogPage = () => {
  const store = useStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleEmptyAdd = () => {
    store.addProduct({ name: '', targetQty: 1, unit: 'pieces', priceHistory: [] });
  };

  return (
    <main className="tab-content" style={{paddingBottom: '32px'}}>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={e => {
        const { active, over } = e;
        if (over && active.id !== over.id) {
          store.reorderProducts(active.id as string, over.id as string);
        }
      }}>
        <div className="panel" style={{borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0}}>
           <div className="list continuous-list">
              
              <div className="list-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 8px 6px', background: '#fff', borderBottom: '1px solid #f1f5f9'}}>
                 <span style={{fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold'}}>Каталог товаров</span>
                 <button className="btn-icon danger" onClick={() => store.deleteProducts(store.products.map(p => p.id))} style={{padding: 0}}><Trash2 size={16} /></button>
              </div>

              <div style={{minHeight: '20px'}}>
                 <SortableContext items={store.products.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {store.products.map(prod => {
                       const inPrep = store.preparedItems.some(i => i.productId === prod.id);
                       return (
                          <SortableRow key={prod.id} id={prod.id}>
                             <InlineEdit value={prod.name} onChange={val => store.updateProduct(prod.id, { name: val })} autoFocus={prod.name === ''}/>
                             <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{prod.unit === 'pieces' ? 'шт' : prod.unit === 'bottles' ? 'бут' : 'уп'}</span>
                             <button 
                                className={\`btn-icon \${inPrep ? 'primary' : ''}\`} 
                                onClick={() => {
                                   if (!inPrep) store.moveItem(prod.id, 'prepared');
                                }}
                                style={{ marginLeft: '12px' }}
                             >
                                <Check size={18} color={inPrep ? '#059669' : '#cbd5e1'} />
                             </button>
                             <button className="btn-icon danger" onClick={() => store.deleteProducts([prod.id])} style={{ marginLeft: '4px' }}>
                                <Trash2 size={18} />
                             </button>
                          </SortableRow>
                       );
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
        </div>
      </DndContext>
    </main>
  );
};
`
fs.writeFileSync('src/presentation/pages/CatalogPage.tsx', content);
