const fs = require('fs');
const content = `import React, { useState } from 'react';
import { useStore } from '../../application/store';
import { DndContext, PointerSensor, closestCorners, DragOverlay, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Check, PackageOpen, RotateCcw, Plus } from 'lucide-react';
import type { Unit } from '../../domain/types';

function parsePositiveInt(val: string, fallback = 1) {
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

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

export const CatalogPage = () => {
  const { products, addProduct, updateProduct, deleteProducts, reorderProducts, deletedBackup, undoDelete } = useStore();

  const [catalogBulkMode, setCatalogBulkMode] = useState(false);
  const [catalogSelectedIds, setCatalogSelectedIds] = useState<Set<string>>(new Set());

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const confirmBulkDeleteProducts = () => {
    if (catalogSelectedIds.size > 0) {
      deleteProducts(Array.from(catalogSelectedIds));
    }
    setCatalogSelectedIds(new Set());
    setCatalogBulkMode(false);
  };

  const formatPriceRange = (history: number[]) => {
    if (!history || history.length === 0) return '?';
    if (history.length === 1) return history[0].toString();
    const min = Math.min(...history);
    const max = Math.max(...history);
    if (min === max) return min.toString();
    return \`\${min}-\${max}\`;
  };

  const handlePriceClick = (prod: any) => {
    const current = prod.priceHistory[prod.priceHistory.length - 1] ?? 0;
    const res = window.prompt(\`Цена:\\nТекущая: \${current}\\nВведите новую базовую цену или +/-\\n(Исторический диапазон: \${formatPriceRange(prod.priceHistory)})\`, '');
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
    
    const hist = [...prod.priceHistory];
    if (hist[hist.length - 1] !== computed) hist.push(computed);
    updateProduct(prod.id, { priceHistory: hist });
  };

  return (
    <main className="tab-content">
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
            {deletedBackup && deletedBackup.products && (
              <button className="btn-icon" onClick={undoDelete} title="Отменить удаление">
                <RotateCcw size={20} />
              </button>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="empty-state small">
            <PackageOpen size={32} />
            <p>Ассортимент пока пуст.</p>
            <button className="btn btn-primary" style={{marginTop: 16}} onClick={() => addProduct({ name: '', targetQty: 1, unit: 'pieces', priceHistory: [] })}>Добавить товар</button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={(e) => { setActiveId(null); if (e.over && e.active.id !== e.over.id) reorderProducts(e.active.id as string, e.over.id as string); }}>
            <SortableContext items={products.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="list">
                {products.map(product => (
                  <SortableRow key={product.id} id={product.id}>
                    {catalogBulkMode && (
                      <input type="checkbox" checked={catalogSelectedIds.has(product.id)} onChange={() => { const next = new Set(catalogSelectedIds); if (next.has(product.id)) next.delete(product.id); else next.add(product.id); setCatalogSelectedIds(next); }} />
                    )}
                    <InlineEdit value={product.name} onChange={val => updateProduct(product.id, { name: val })} autoFocus={product.name === ''}/>       
                    <div className="counter-wrap" style={{marginLeft: 4}}>
                      <button className="counter-btn" onClick={() => updateProduct(product.id, { targetQty: Math.max(1, product.targetQty - 1) })}>-</button>   
                      <input className="counter-input" style={{width: '24px'}} type="number" min={1} value={product.targetQty || 1} onChange={(e) => updateProduct(product.id, { targetQty: parsePositiveInt(e.target.value, 1) })} />
                      <button className="counter-btn" onClick={() => updateProduct(product.id, { targetQty: (product.targetQty || 1) + 1 })}>+</button>
                    </div>
                    <select className="row-unit" style={{marginLeft: 4, width: '50px', background: 'transparent', border: 'none', appearance: 'none', color: '#64748b', fontSize: '0.8rem'}} value={product.unit} onChange={(e) => updateProduct(product.id, { unit: e.target.value as Unit })}>
                      <option value="pieces">Шт</option>
                      <option value="bottles">Бут</option>
                      <option value="packs">Уп</option>
                    </select>
                    
                    <div onClick={() => handlePriceClick(product)} style={{ marginLeft: 8, cursor: 'pointer', minWidth: '40px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>
                       {formatPriceRange(product.priceHistory)}
                    </div>
                  </SortableRow>
                ))}

                <div style={{padding: '12px 0 4px', display: 'flex', justifyContent: 'center'}}>
                  <button 
                    className="btn-icon" 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', color: '#475569' }} 
                    onClick={() => addProduct({ name: '', targetQty: 1, unit: 'pieces', priceHistory: [] })}
                  >
                    <Plus size={24} />
                  </button>
                </div>
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
`
fs.writeFileSync('src/presentation/pages/CatalogPage.tsx', content);
