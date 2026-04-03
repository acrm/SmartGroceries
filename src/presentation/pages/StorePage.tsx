import React, { useState } from 'react';
import { useStore } from '../../application/store';
import { DndContext, PointerSensor, closestCenter, DragOverlay, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ArrowDown, ArrowUp } from 'lucide-react';

const SortableRow = ({ id, children, className }: {id: string, children: React.ReactNode, className?: string}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={`line-row sortable-row${isDragging ? ' dragging' : ''}${className ? ' ' + className : ''}`}>
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
  let remaining = budget - spent;

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

  return (
    <main className="tab-content">
      <section className="panel">
        <h2 className="panel-title">Бюджет</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#64748b' }}>Общий бюджет (RSD)</span>
            <span>{budget}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#065f46' }}>Потрачено: {spent} RSD</span>
            <span style={{ fontWeight: 'bold' }}>Остаток: {remaining} RSD</span>
          </div>
        </div>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setActiveId(e.active.id as string)} onDragEnd={onDragEnd}>
        <section className="panel">
          <div className="panel-toolbar">
             <h2 className="panel-title">К покупке</h2>
             <button className="btn-icon"><Trash2 size={20}/></button>
          </div>
          <div className="list" id="unpicked-list">
             <SortableContext items={unpicked.map(i => i.productId)} strategy={verticalListSortingStrategy}>
               {unpicked.map(item => {
                 const prod = store.products.find(p => p.id === item.productId);
                 if (!prod) return null;
                 return (
                   <SortableRow key={item.productId} id={item.productId}>
                     <span className="row-name static" style={{ flex: 1 }}>{prod.name}</span>
                     <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{item.qty} {prod.unit === 'pieces' ? 'шт' : prod.unit === 'bottles' ? 'бут' : 'уп'}</span>
                     <button className="btn-icon" onClick={() => store.moveItem(item.productId, 'picked')} style={{ marginLeft: 'auto' }}><ArrowDown size={18}/></button>
                   </SortableRow>
                 )
               })}
             </SortableContext>
             {unpicked.length === 0 && <div className="empty-state small"><p>Пусто</p></div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-toolbar">
             <h2 className="panel-title">В корзине</h2>
          </div>
          <div className="list" id="picked-list">
             <SortableContext items={picked.map(i => i.productId)} strategy={verticalListSortingStrategy}>
               {picked.map(item => {
                 const prod = store.products.find(p => p.id === item.productId);
                 if (!prod) return null;
                 return (
                   <SortableRow key={item.productId} id={item.productId} className="zone-covered">
                     <span className="row-name static" style={{ flex: 1 }}>{prod.name}</span>
                     <input className="field field-sm" type="number" placeholder="Цена" value={item.actualUnitPrice ?? ''} onChange={e => store.updatePreparedPrice(prod.id, parseFloat(e.target.value) || null, true)} style={{ width: '80px', marginLeft: '8px' }} />
                     <button className="btn-icon" onClick={() => store.moveItem(item.productId, 'unpicked')} style={{ marginLeft: '8px' }}><ArrowUp size={18}/></button>
                   </SortableRow>
                 )
               })}
             </SortableContext>
             {picked.length === 0 && <div className="empty-state small"><p>Пусто</p></div>}
          </div>
        </section>
        
        <DragOverlay>
           {activeId ? <div className="line-row dragging" style={{ background: '#fff' }}><button className="drag-handle"><GripVertical size={18}/></button><span className="row-name static" style={{flex: 1}}>...</span></div> : null}
        </DragOverlay>
      </DndContext>

      {picked.length > 0 && (
         <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => { if(window.confirm('Сохранить в историю и очистить список?')) store.completePurchases() }}>Завершить покупки</button>    
      )}
    </main>
  );
};
