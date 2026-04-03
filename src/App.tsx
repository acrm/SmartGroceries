import { useStore } from './application/store';
import { Layout } from './presentation/components/Layout';
import { Tabs } from './presentation/components/Tabs';
import { CatalogPage } from './presentation/pages/CatalogPage';
import { PreparationPage } from './presentation/pages/PreparationPage';
import { StorePage } from './presentation/pages/StorePage';
import { HistoryPage } from './presentation/pages/HistoryPage';
import './App.css';

export default function App() {
  const { activeTab } = useStore();

  return (
    <Layout>
      {activeTab === 'catalog' && <CatalogPage />}
      {activeTab === 'preparation' && <PreparationPage />}
      {activeTab === 'store' && <StorePage />}
      {activeTab === 'history' && <HistoryPage />}
      <Tabs />
    </Layout>
  );
}
