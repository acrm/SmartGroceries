
import { useStore } from '../../application/store';
import { Trash2, RotateCcw } from 'lucide-react';

export const HistoryPage = () => {
  const store = useStore();
  
  if (store.history.length === 0) {
    return (
      <main className="tab-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
           <p>История покупок пуста</p>
        </div>
      </main>
    );
  }

  return (
    <main className="tab-content">
      <div className="panel-toolbar" style={{ marginBottom: '16px' }}>
         <h2 className="panel-title">История</h2>
         <button className="btn-icon" onClick={() => { if(window.confirm('Очистить историю?')) store.clearHistory() }}><Trash2 size={20}/></button>
      </div>
      
      {store.history.map(trip => {
        const date = new Date(trip.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return (
          <section key={trip.id} className="panel" style={{ marginBottom: '16px' }}>
             <div className="panel-toolbar" style={{ marginBottom: '8px' }}>
                <h3 className="panel-title" style={{ fontSize: '1rem' }}>{date}</h3>
                <button className="btn-icon" onClick={() => { if(window.confirm('Добавить товары из этой покупки в новый список?')) store.restoreFromHistory(trip.id) }}><RotateCcw size={18}/></button>
             </div>
             <div className="list">
               {trip.items.map(item => {
                 const prod = store.products.find(p => p.id === item.productId);
                 return (
                   <div key={item.productId} className="line-row">
                      <span className="row-name static" style={{ flex: 1 }}>{prod?.name || 'Неизвестный товар'}</span>
                      <span style={{ color: '#64748b', fontSize: '0.9rem', marginRight: '8px' }}>{item.qty} {prod?.unit === 'pieces' ? 'шт' : 'г'}</span>
                      <span style={{ fontWeight: '500' }}>{item.actualUnitPrice ? item.actualUnitPrice * item.qty : 0} RSD</span>
                   </div>
                 )
               })}
             </div>
             <div style={{ marginTop: '12px', textAlign: 'right', fontWeight: 'bold', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                Итого: {trip.items.reduce((sum, item) => sum + item.total, 0)} RSD
             </div>
          </section>
        );
      })}
    </main>
  );
};
