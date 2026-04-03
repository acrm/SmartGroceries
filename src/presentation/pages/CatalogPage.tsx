import { useState } from 'react';
import { useStore } from '../../application/store';
import { DndContext, closestCenter, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { Product } from '../../domain/types';

const SortableItem = ({ product, moveItem, deleteProducts }: { product: Product, moveItem: (id: string, targetList: 'assortment' | 'prepared' | 'picked' | 'unpicked', overId?: string) => void, deleteProducts: (ids: string[]) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  
  return (
    <div ref={setNodeRef} style={style} className="bg-white p-3 mb-2 rounded shadow flex items-center justify-between">
      <div {...attributes} {...listeners} className="mr-3 cursor-grab text-gray-400">
        <GripVertical size={20}/>
      </div>
      <div className="flex-1">
        <div className="font-semibold">{product.name || 'Без названия'}</div>
        <div className="text-xs text-gray-500">
          {product.unit === 'pieces' ? 'Шт' : product.unit === 'bottles' ? 'л/Бутылки' : 'г/Пачки'}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button onClick={() => moveItem(product.id, 'prepared')} className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200">
          <Plus size={16}/>
        </button>
        <button onClick={() => deleteProducts([product.id])} className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full">
          <Trash2 size={16}/>
        </button>
      </div>
    </div>
  );
};

export const CatalogPage = () => {
  const { products, addProduct, moveItem, deleteProducts, reorderProducts } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);

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

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-800">Ассортимент</h2>
      
      <DndContext collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={products.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {products.map(p => (
            <SortableItem key={p.id} product={p} moveItem={moveItem} deleteProducts={deleteProducts} />
          ))}
        </SortableContext>
        
        <DragOverlay>
          {activeProduct ? (
            <div className="bg-white p-3 rounded shadow-xl flex items-center justify-between opacity-90 scale-105 border border-blue-300">
              <div className="mr-3 text-blue-400"><GripVertical size={20}/></div>
              <div className="flex-1 font-semibold">{activeProduct.name || 'Без названия'}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      
      <button onClick={addProduct} className="w-full mt-4 p-4 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg font-bold flex flex-col items-center justify-center hover:bg-blue-50 transition">
        <Plus size={24} className="mb-1" />
        Добавить новый товар
      </button>
    </div>
  );
};
