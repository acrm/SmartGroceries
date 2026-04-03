const fs = require('fs');

const content = `import React, { useState } from 'react';
import { useStore } from '../../application/store';
import { AutoCompleteInput } from '../../components/AutoCompleteInput';
import { Trash2, GripVertical, Plus } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';

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

const InlineQtyEdit = ({ value, onChange }: {value: number, onChange: (v: number) => void}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value.toString());

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '4px', padding: '2px' }}>
        <button className="counter-btn" onClick={() => onChange(Math.max(1, parseInt(val || '1') - 1))}>-</button>   
        <input 
          type="number" 
          autoFocus
          value={val}
          min={1}
          onChange={e => setVal(e.target.value)}
          onBlur={() => {
            setEditing(false);
            onChange(parseInt(val || '1'));
          }}
          onKeyDown={e => { if(e.key === 'Enter') e.currentTarget.blur() }}
          style={{width: '30px', border: 'none', background: 'transparent', textAlign: 'center', outline: 'none'}}
        />
        <button className="counter-btn" onClick={() => onChange(parseInt(val || '1') + 1)}>+</button>
      </div>
    );
  }

  return (
    <span 
      onClick={() => {
        setVal(value.toString());
        setEditing(true);
      }} 
      style={{ cursor: 'pointer', padding: '0 8px', fontWeight: 'bold' }}
    >
      {value}
    </span>
  );
};

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

export const PreparationPage = () => {
  const store = useStore();
  const [inputValue, setInputValue] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleSelect = (name: string) => {
    store.addProduct({ name, targetQty: 1, unit: 'pieces', priceHistory: [] });
    setTimeout(() => {
      const state = useStore.getState();
      const newProd = state.products[state.products.length - 1];
      if (newProd) state.moveItem(newProd.id, 'prepared');
    }, 50);
    setInputValue('');
  };

  const handleEmptyAdd = () => {
    store.addProduct({ name: '', targetQty: 1, unit: 'pieces', priceHistory: [] });
    setTimeout(() => {
       const state = useStore.getState();
       const newProd = state.products[state.products.length - 1];
       if (newProd) state.moveItem(newProd.id, 'prepared');
    }, 50);
  };

  return (
    <main className="tab-content" style={{paddingBottom: '32px'}}>
      
      <div className="panel" style={{marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, display: 'flex', flexDirection: 'column', gap: '12px'}}>
         <h2 className="panel-title">Добавление</h2>
         <AutoCompleteInput
            value={inputValue}
            onChange={setInputValue}
            onSelect={handleSelect}
            suggestions={store.products.map(p => p.name)}
         />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={e => {
        const { active, over } = e;
        if (over && active.id !== over.id) {
          store.reorderPrepared(active.id as string, over.id as string);
        }
      }}>
        <div className="panel" style={{borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0}}>
           <div className="list continuous-list">
              
              <div className="list-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 8px 6px', background: '#fff', borderBottom: '1px solid #f1f5f9'}}>
                  <span style={{fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold'}}>Список</span>
                  <button className="btn-icon danger" onClick={() => store.deleteProducts(store.products.map(p => p.id))} style={{padding: 0}}><Trash2 size={16} /></button>
              </div>

              <div style={{minHeight: '20px'}}>
                 <SortableContext items={store.preparedItems.map(i => i.productId)} strategy={verticalListSortingStrategy}>
                 {store.preparedItems.map(item => {
                    const prod = store.products.find(p => p.id === item.productId);
                    if (!prod) return null;
                    return (
                       <SortableRow key={item.productId} id={item.productId}>
                       <InlineEdit value={prod.name} onChange={val => store.updateProduct(prod.id, { name: val })} autoFocus={prod.name === ''}/>
                       <div style={{ display: 'flex', alignItems: 'center' }}>
                          <InlineQtyEdit value={item.qty} onChange={val => store.updatePreparedQty(item.productId, val)} />
                          <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '4px' }}>{prod.unit === 'pieces' ? 'шт' : prod.unit === 'bottles' ? 'бут' : 'уп'}</span>
                       </div>
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
        </div>
      </DndContext>
    </main>
  );
};
`
fs.writeFileSync('src/presentation/pages/PreparationPage.tsx', content);
