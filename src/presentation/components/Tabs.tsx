import { useStore } from '../../application/store';
import { PackageOpen, ClipboardList, ShoppingBag, History } from 'lucide-react';

export const Tabs = () => {
  const { activeTab, setTab } = useStore();
  
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-btn${activeTab === 'catalog' ? ' active' : ''}`}
        onClick={() => setTab('catalog')}
      >
        <PackageOpen size={20} />
        <span>Ассортимент</span>
      </button>
      <button
        className={`nav-btn${activeTab === 'preparation' ? ' active' : ''}`}
        onClick={() => setTab('preparation')}
      >
        <ClipboardList size={20} />
        <span>Подготовка</span>
      </button>
      <button
        className={`nav-btn${activeTab === 'store' ? ' active' : ''}`}
        onClick={() => setTab('store')}
      >
        <ShoppingBag size={20} />
        <span>Магазин</span>
      </button>
      <button
        className={`nav-btn${activeTab === 'history' ? ' active' : ''}`}
        onClick={() => setTab('history')}
      >
        <History size={20} />
        <span>История</span>
      </button>
    </nav>
  );
};
