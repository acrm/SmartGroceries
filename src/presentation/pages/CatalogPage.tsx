import React, { useState } from 'react';
import { useStore } from '../../application/store';
import { DndContext, PointerSensor, closestCenter, DragOverlay, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Check, PackageOpen } from 'lucide-react';
import type { Unit } from '../../domain/types';

function parsePositiveInt(val: string, fallback = 1) {
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

function parsePriceInput(val: string): number | null {
  if (!val.trim()) return null;
  const num = parseFloat(val.replace(',', '.'));
  return isNaN(num) || num < 0 ? null : num;
}

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

export const CatalogPage = () => {
  const { products, addProduct, updateProduct, deleteProducts, reorderProducts } = useStore();
  
  const [catalogBulkMode, setCatalogBulkMode] = useState(false);
  const [catalogSelectedIds, setCatalogSelectedIds] = useState<Set<string>>(new Set());

  const [newProductName, setNewProductName] = useState('');
  const [newProductQty, setNewProductQty] = useState('1');
  const [newProductUnit, setNewProductUnit] = useState<Unit>('pieces');
  const [newProductPrice, setNewProductPrice] = useState('');

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleAdd = () => {
    if (!newProductName.trim()) return;
    addProduct({
      name: newProductName.trim(),
      targetQty: parsePositiveInt(newProductQty),
      unit: newProductUnit,
      priceHistory: parsePriceInput(newProductPrice) !== null ? [parsePriceInput(newProductPrice) as number] : []
    });
    setNewProductName('');
    setNewProductQty('1');
    setNewProductPrice('');
  };

  const confirmBulkDeleteProducts = () => {
    if (catalogSelectedIds.size > 0) {
      deleteProducts(Array.from(catalogSelectedIds));
    }
    setCatalogSelectedIds(new Set());
    setCatalogBulkMode(false);
  };

  return (
    <main className="tab-content">
      <section className="panel">
        <h2 className="panel-title">Добавить товар</h2>
        <div className="form-row">
          <input className="field" type="text" placeholder="Название" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
          <select className="field field-sm" value={newProductUnit} onChange={(e) => setNewProductUnit(e.target.value as Unit)}>
            <option value="pieces">Штуки</option>
            <option value="liters">Литры</option>
            <option value="grams">Граммы</option>
          </select>
          <input className="field field-sm" type="number" min={1} value={newProductQty} onChange={(e) => setNewProductQty(e.target.value)} />
          <input className="field field-sm" type="number" min={0} placeholder="Цена" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} />
          <button className="btn btn-primary" onClick={handleAdd}>
            + Добавить
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-toolbar">
          <h2 className="panel-title">Ассортимент</h2>
          <div className="toolbar-actions">
            <button className="btn-icon" onClick={() => { setCatalogBulkMode(!catalogBulkMode); setCatalogSelectedIds(new Set()); }}>
              <Trash2 size={20} />
            </button>
            {catalogBulkMode && (
              <button className="btn-icon danger" disabled={catalogSelectedIds.size === 0} onClick={confirmBulkDeleteProducts}>
                <Check size={20} />
              </button>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="empty-state small">
            <PackageOpen size={32} />
            <p>Ассортимент пока пуст.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={(e) => { setActiveId(null); if (e.over && e.active.id !== e.over.id) reorderProducts(e.active.id as string, e.over.id as string); }}>
            <SortableContext items={products.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="list">
                {products.map(product => (
                  <SortableRow key={product.id} id={product.id}>
                    {catalogBulkMode && (
                      <input type="checkbox" checked={catalogSelectedIds.has(product.id)} onChange={() => { const next = new Set(catalogSelectedIds); if (next.has(product.id)) next.delete(product.id); else next.add(product.id); setCatalogSelectedIds(next); }} />
                    )}
                    <input className="row-name" type="text" value={product.name} onChange={(e) => updateProduct(product.id, { name: e.target.value })} />
                    <div className="counter-wrap">
                      <button className="counter-btn" onClick={() => updateProduct(product.id, { targetQty: Math.max(1, product.targetQty - 1) })}>-</button>
                      <input className="counter-input" type="number" min={1} value={product.targetQty || 1} onChange={(e) => updateProduct(product.id, { targetQty: parsePositiveInt(e.target.value, 1) })} />
                      <button className="counter-btn" onClick={() => updateProduct(product.id, { targetQty: (product.targetQty || 1) + 1 })}>+</button>
                    </div>
                    <select className="row-unit" value={product.unit} onChange={(e) => updateProduct(product.id, { unit: e.target.value as Unit })}>
                      <option value="pieces">Шт</option>
                      <option value="liters">Л</option>
                      <option value="grams">Г</option>
                    </select>
                    <input className="row-price" type="number" min={0} placeholder="?" value={product.priceHistory && product.priceHistory.length > 0 ? product.priceHistory[product.priceHistory.length - 1] : ''} onChange={(e) => updateProduct(product.id, { priceHistory: parsePriceInput(e.target.value) !== null ? [parsePriceInput(e.target.value) as number] : [] })} />
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div className="line-row dragging" style={{ background: '#fff' }}>
                  <button type="button" className="drag-handle"><GripVertical size={18} /></button>
                  <span className="row-name" style={{ flex: 1, padding: '4px 6px', fontWeight: 600 }}>{products.find(p => p.id === activeId)?.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </section>
    </main>
  );
};
