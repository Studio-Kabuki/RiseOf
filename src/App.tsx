import { useState } from 'react';
import { RestaurantMap } from './components/RestaurantMap';
import { TitleScreen } from './components/TitleScreen';
import { MenuSelectionWindow } from './components/MenuSelectionWindow';
import { DayClock } from './components/DayClock';
import { DayEndWindow } from './components/DayEndWindow';
import { useRestaurantStore, useEntityStore, useMenuStore } from './store';
import './App.css';

function App() {
  const [showGame, setShowGame] = useState(false);
  const { money, isPaused, togglePause, gameSpeed, cycleSpeed, reset: resetRestaurant } = useRestaurantStore();
  const { reset: resetEntities, addCustomer } = useEntityStore();
  const { assignSeat, getAvailableSeats } = useRestaurantStore();
  const { registeredMenus, gameStarted, reset: resetMenu, openSelection } = useMenuStore();

  const handleGameStart = () => {
    setShowGame(true);
    openSelection();
  };

  const handleReset = () => {
    resetRestaurant();
    resetEntities();
    resetMenu();
    setShowGame(false);
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
      {/* メニュー選択ウィンドウ */}
      <MenuSelectionWindow />

      {/* 1日終了ウィンドウ */}
      <DayEndWindow />

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

        {/* 時計ゲージ（中央） */}
        <DayClock />

        <div style={{ fontSize: '1.2rem' }}>
          {money} 円
        </div>
      </div>

      {/* ゲームエリア */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: showGame ? '20px' : '0',
          backgroundColor: '#e0e0e0',
          minHeight: 'calc(100vh - 220px)',
          position: 'relative',
        }}
      >
        {showGame ? (
          <>
            <RestaurantMap />
            {/* 閉店オーバーレイ（ゲーム開始前） */}
            {!gameStarted && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: '#ff6b6b',
                    padding: '20px 40px',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    border: '3px solid #ff6b6b',
                  }}
                >
                  CLOSED
                </div>
              </div>
            )}
          </>
        ) : (
          <TitleScreen onStart={handleGameStart} />
        )}
      </div>

      {/* メニューバー（フッター付近） */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px 20px',
          backgroundColor: '#ECE9D8',
          borderTop: '2px solid #7F9DB9',
          borderBottom: '2px solid #7F9DB9',
        }}
      >
        <span style={{ fontSize: '12px', color: '#003399', fontWeight: 'bold' }}>
          メニュー:
        </span>
        {registeredMenus.map((menu) => (
          <div
            key={menu.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'white',
              border: '1px solid #7F9DB9',
              borderRadius: '4px',
            }}
          >
            <img
              src={menu.iconUrl}
              alt={menu.name}
              style={{ width: '24px', height: '24px' }}
            />
            <span style={{ fontSize: '11px', color: '#333' }}>{menu.name}</span>
            <span style={{ fontSize: '10px', color: '#666' }}>{menu.price}円</span>
          </div>
        ))}
        {registeredMenus.length === 0 && (
          <span style={{ fontSize: '11px', color: '#999' }}>
            メニューを選択してください
          </span>
        )}
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
          disabled={!gameStarted}
          style={{
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: gameStarted ? 'pointer' : 'not-allowed',
            backgroundColor: !gameStarted ? '#666' : isPaused ? '#4caf50' : '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            opacity: gameStarted ? 1 : 0.5,
          }}
        >
          {isPaused ? '▶ 再開' : '⏸ 一時停止'}
        </button>

        <button
          onClick={cycleSpeed}
          disabled={!gameStarted}
          style={{
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: gameStarted ? 'pointer' : 'not-allowed',
            backgroundColor: !gameStarted ? '#666' : gameSpeed === 1 ? '#9e9e9e' : '#e91e63',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            minWidth: '80px',
            opacity: gameStarted ? 1 : 0.5,
          }}
        >
          x{gameSpeed}
        </button>

        <button
          onClick={handleAddCustomer}
          disabled={!gameStarted}
          style={{
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: gameStarted ? 'pointer' : 'not-allowed',
            backgroundColor: gameStarted ? '#2196f3' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            opacity: gameStarted ? 1 : 0.5,
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
