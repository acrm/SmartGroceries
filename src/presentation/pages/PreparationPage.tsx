import React, { useState } from 'react';
import { useStore } from '../../application/store';
import { DndContext, PointerSensor, closestCenter, DragOverlay, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

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

  return (
    <main className="tab-content">
      <section className="panel">
        <h2 className="panel-title">Бюджет</h2>
        <div className="budget-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '0.9rem', color: '#64748b' }}>Общий бюджет (RSD)</label>
            <input className="field field-sm" type="number" value={budget} onChange={(e) => setBudget(parseFloat(e.target.value) || 0)} style={{ width: '120px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#065f46' }}>В зоне: {inZoneTotal} RSD</span>
            <span style={{ fontWeight: 'bold' }}>Остаток: {remaining} RSD</span>
          </div>
          {noPriceCount > 0 && <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>Без цены: {noPriceCount} поз.</div>}
        </div>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setActiveId(e.active.id as string)} onDragEnd={onDragEnd}>
        <section className="panel">
          <div className="panel-toolbar">
            <h2 className="panel-title">К покупке</h2>
            <div className="toolbar-actions">
              <button className="btn-icon" onClick={() => { if(window.confirm('Очистить список к покупке?')) setupItems.forEach(i => store.moveItem(i.productId, 'assortment')) }}><Trash2 size={20} /></button>
            </div>
          </div>
          <div className="list" id="prep-list">
            <SortableContext items={setupItems.map(i => i.productId)} strategy={verticalListSortingStrategy}>
              {itemsWithZone.map(({ productId, qty, prod, inZone }) => prod ? (
                <SortableRow key={productId} id={productId} className={inZone ? 'zone-covered' : 'zone-out'}>
                  <span className="row-name static" style={{ flex: 1 }}>{prod.name}</span>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{qty} {prod.unit === 'pieces' ? 'шт' : prod.unit === 'bottles' ? 'бут' : 'уп'}</span>
                  <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                    {prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}
                  </span>
                  <button className="btn-icon" style={{ marginLeft: 'auto' }} onClick={() => store.moveItem(productId, 'assortment')}><ArrowDown size={18} /></button>
                </SortableRow>
              ) : null)}
            </SortableContext>
            {setupItems.length === 0 && <div className="empty-state small"><p>Пусто</p></div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-toolbar">
            <h2 className="panel-title">Ассортимент</h2>
            <div className="toolbar-actions">
              <button className="btn-icon" onClick={() => { if(window.confirm('Очистить весь ассортимент?')) store.deleteProducts(store.products.map(p => p.id)) }}><Trash2 size={20} /></button>
            </div>
          </div>
          <div className="list" id="assortment-list">
            <SortableContext items={assortment.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {assortment.map(prod => (
                <SortableRow key={prod.id} id={prod.id}>
                  <span className="row-name static" style={{ flex: 1 }}>{prod.name}</span>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{prod.targetQty} {prod.unit === 'pieces' ? 'шт' : prod.unit === 'bottles' ? 'бут' : 'уп'}</span>
                  <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                    {prod.priceHistory[prod.priceHistory.length - 1] ?? '?'}
                  </span>
                   <button className="btn-icon" style={{ marginLeft: 'auto' }} onClick={() => store.moveItem(prod.id, 'prepared')}><ArrowUp size={18} /></button>
                </SortableRow>
              ))}
            </SortableContext>
            {assortment.length === 0 && <div className="empty-state small"><p>Пусто</p></div>}
          </div>
        </section>

        <DragOverlay>
          {activeId ? (
             <div className="line-row dragging" style={{ background: '#fff' }}>
                <button type="button" className="drag-handle"><GripVertical size={18} /></button>
                <span className="row-name static" style={{ flex: 1, padding: '4px 6px', fontWeight: 600 }}>...</span>
             </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
};
