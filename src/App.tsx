import { useStore } from './application/store';
import { Layout } from './presentation/components/Layout';
import { Tabs } from './presentation/components/Tabs';
import { CatalogPage } from './presentation/pages/CatalogPage';

export default function App() {
  const { activeTab } = useStore();
  
  return (
    <Layout>
      {activeTab === 'catalog' && <CatalogPage />}
      {activeTab === 'preparation' && <div className='p-4 font-bold text-center text-gray-500'>Подготовка (В разработке)</div>}
      {activeTab === 'store' && <div className='p-4 font-bold text-center text-gray-500'>В магазине (В разработке)</div>}
      {activeTab === 'history' && <div className='p-4 font-bold text-center text-gray-500'>История (В разработке)</div>}
      <Tabs />
    </Layout>
  );
}
