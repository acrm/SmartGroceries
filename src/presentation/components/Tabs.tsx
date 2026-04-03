
import { useStore } from '../../application/store';
import { ShoppingCart, LayoutList, CheckSquare, Clock } from 'lucide-react';

export const Tabs = () => {
  const { activeTab, setTab } = useStore();
  const tabs = [
    { id: 'catalog', label: 'Ассортимент', icon: LayoutList },
    { id: 'preparation', label: 'Подготовка', icon: ShoppingCart },
    { id: 'store', label: 'В магазине', icon: CheckSquare },
    { id: 'history', label: 'История', icon: Clock }
  ] as const;

  return (
    <nav className="fixed bottom-0 w-full bg-white shadow-t border-t flex z-10 h-16 pb-2">
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)} 
            className={`flex-1 flex flex-col items-center justify-center pt-2 text-xs font-medium 
              ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Icon size={20} className={`mb-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
};
