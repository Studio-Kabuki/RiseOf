import { RestaurantMap } from './components/RestaurantMap';
import { useRestaurantStore, useEntityStore } from './store';
import './App.css';

function App() {
  const { money, isPaused, togglePause, reset: resetRestaurant } = useRestaurantStore();
  const { reset: resetEntities, addCustomer } = useEntityStore();
  const { assignSeat, getAvailableSeats } = useRestaurantStore();

  const handleReset = () => {
    resetRestaurant();
    resetEntities();
    // リセット後に再度お客さんを追加（RestaurantMapの初期化に任せる）
    window.location.reload();
  };

  const handleAddCustomer = () => {
    const availableSeats = getAvailableSeats();
    if (availableSeats.length > 0) {
      const customerId = addCustomer(availableSeats[0].id);
      assignSeat(availableSeats[0].id, customerId);
    }
  };

  return (
    <div className="app">
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          backgroundColor: '#333',
          color: 'white',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          サイゼリヤ シミュレーター
        </h1>
        <div style={{ fontSize: '1.2rem' }}>
          💰 {money} 円
        </div>
      </div>

      {/* ゲームエリア */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          backgroundColor: '#e0e0e0',
          minHeight: 'calc(100vh - 120px)',
        }}
      >
        <RestaurantMap />
      </div>

      {/* コントロールパネル */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          padding: '10px 20px',
          backgroundColor: '#333',
        }}
      >
        <button
          onClick={togglePause}
          style={{
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: 'pointer',
            backgroundColor: isPaused ? '#4caf50' : '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
          }}
        >
          {isPaused ? '▶ 再開' : '⏸ 一時停止'}
        </button>

        <button
          onClick={handleAddCustomer}
          style={{
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: 'pointer',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
          }}
        >
          + お客さん追加
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: 'pointer',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
          }}
        >
          リセット
        </button>
      </div>
    </div>
  );
}

export default App;
