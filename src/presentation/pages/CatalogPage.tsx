import { useState } from 'react';
import { useStore } from '../../application/store';
import { DndContext, closestCenter, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from 'lucide-react';
import type { Product, Unit } from '../../domain/types';

interface SortableItemProps {
  product: Product;
  moveItem: (id: string, targetList: 'assortment' | 'prepared' | 'picked' | 'unpicked', overId?: string) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  bulkMode: boolean;
  isSelected: boolean;
  toggleSelect: (id: string) => void;
}

const SortableItem = ({ product, moveItem, updateProduct, bulkMode, isSelected, toggleSelect }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-1 border-b border-gray-200 py-2 min-h-[48px] bg-gray-50 ${isDragging ? 'shadow-lg bg-white relative z-10' : ''}`}>
      <div {...attributes} {...listeners} className="cursor-grab text-gray-400 p-1 shrink-0">
        <GripVertical size={18}/>
      </div>
      
      {bulkMode && (
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => toggleSelect(product.id)}
          className="w-5 h-5 shrink-0 ml-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      )}

      <input
        type="text"
        className="flex-1 min-w-0 bg-transparent border-none focus:ring-1 focus:ring-blue-300 focus:bg-white px-1 text-[15px] outline-none rounded"
        value={product.name}
        placeholder="Название..."
        onChange={(e) => updateProduct(product.id, { name: e.target.value })}
      />

      <div className="flex items-center bg-gray-200 rounded shrink-0 h-8">
        <button 
          onClick={() => updateProduct(product.id, { targetQty: Math.max(1, product.targetQty - 1) })}
          className="w-7 h-full text-gray-600 hover:bg-gray-300 rounded-l focus:outline-none flex justify-center items-center font-bold"
        >
          -
        </button>
        <input 
          type="number" 
          min={1}
          value={product.targetQty || 1}
          onChange={(e) => updateProduct(product.id, { targetQty: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-8 h-full text-center bg-transparent border-none p-0 text-sm focus:ring-1 focus:ring-blue-300 focus:bg-white outline-none z-10"
          style={{ appearance: 'textfield', WebkitAppearance: 'none', MozAppearance: 'textfield' }}
        />
        <button 
          onClick={() => updateProduct(product.id, { targetQty: (product.targetQty || 1) + 1 })}
          className="w-7 h-full text-gray-600 hover:bg-gray-300 rounded-r focus:outline-none flex justify-center items-center font-bold"
        >
          +
        </button>
      </div>

      <select 
        value={product.unit}
        onChange={(e) => updateProduct(product.id, { unit: e.target.value as Unit })}
        className="bg-transparent border-none text-[13px] text-gray-600 px-1 py-1 shrink-0 focus:ring-1 focus:ring-blue-300 focus:bg-white rounded w-[60px] outline-none cursor-pointer"
      >
        <option value="pieces">Шт</option>
        <option value="bottles">Бутылки</option>
        <option value="packs">Пачки</option>
      </select>

      <button onClick={() => moveItem(product.id, 'prepared')} className="shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 ml-1 focus:outline-none">
        <Plus size={18}/>
      </button>
    </div>
  );
};

export const CatalogPage = () => {
  const { products, addProduct, updateProduct, moveItem, deleteProducts, reorderProducts } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeProduct = activeId ? products.find(p => p.id === activeId) : null;

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    if (active.id !== over.id) {
      reorderProducts(active.id as string, over.id as string);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size > 0) {
      deleteProducts(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
    setBulkMode(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">Ассортимент</h2>     
        <div>
          {bulkMode ? (
            <div className="flex gap-2">
              <button 
                onClick={handleDeleteSelected} 
                className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer"
              >
                Удалить ({selectedIds.size})
              </button>
              <button 
                onClick={() => { setBulkMode(false); setSelectedIds(new Set()); }} 
                className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer"
              >
                Отмена
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setBulkMode(true)} 
              className="text-sm text-gray-600 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors cursor-pointer border border-gray-200"
            >
              Удаление
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <DndContext collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <SortableContext items={products.map(p => p.id)} strategy={verticalListSortingStrategy}>
            {products.map(p => (
              <SortableItem 
                key={p.id} 
                product={p} 
                moveItem={moveItem} 
                updateProduct={updateProduct}
                bulkMode={bulkMode}
                isSelected={selectedIds.has(p.id)}
                toggleSelect={toggleSelect}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeProduct ? (
              <div className="flex items-center gap-2 bg-white p-2 rounded shadow-xl border border-blue-200 opacity-90 scale-105">
                <div className="text-blue-400"><GripVertical size={18}/></div>
                <div className="font-semibold text-sm">{activeProduct.name || 'Без названия'}</div>
                <div className="text-xs text-gray-500">{activeProduct.targetQty} {activeProduct.unit}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        
        <button 
          onClick={() => {
             addProduct(); 
             // Scroll to bottom optionally, but usually default behavior is enough
          }}
          className="w-full mt-3 mb-4 p-3 border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-lg font-bold flex items-center justify-center transition-colors cursor-pointer bg-gray-50 hover:bg-blue-50/50"
        >
          <Plus size={20} className="mr-2" />
          Добавить новый товар
        </button>
      </div>
    </div>
  );
};
