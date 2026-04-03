import { useStore } from './application/store';
import { Layout } from './presentation/components/Layout';
import { Tabs } from './presentation/components/Tabs';
import { CatalogPage } from './presentation/pages/CatalogPage';
import './App.css';

export default function App() {
  const { activeTab } = useStore();

  return (
    <Layout>
      {activeTab === 'catalog' && <CatalogPage />}
      {activeTab === 'preparation' && <main className='tab-content'><section className='panel'><h2 className='panel-title'>Подготовка (В разработке)</h2></section></main>}
      {activeTab === 'store' && <main className='tab-content'><section className='panel'><h2 className='panel-title'>В магазине (В разработке)</h2></section></main>}
      {activeTab === 'history' && <main className='tab-content'><section className='panel'><h2 className='panel-title'>История (В разработке)</h2></section></main>}
      <Tabs />
    </Layout>
  );
}
