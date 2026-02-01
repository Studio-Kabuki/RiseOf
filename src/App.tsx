import { useState } from 'react';
import { RestaurantMap } from './components/RestaurantMap';
import { TitleScreen } from './components/TitleScreen';
import { DayClock } from './components/DayClock';
import { DayEndWindow } from './components/DayEndWindow';
import { GameOverWindow } from './components/GameOverWindow';
import { ShopWindow } from './components/ShopWindow';
import { useRestaurantStore, useEntityStore, useMenuStore, useShopStore } from './store';
import './App.css';

function App() {
  const [showGame, setShowGame] = useState(false);
  const { isPaused, togglePause, gameSpeed, cycleSpeed, reset: resetRestaurant, isOpen } = useRestaurantStore();
  const { reset: resetEntities } = useEntityStore();
  const { registeredMenus, gameStarted, reset: resetMenu, startGame } = useMenuStore();
  const { openShop, reset: resetShop } = useShopStore();

  const handleGameStart = () => {
    setShowGame(true);
    startGame(); // ゲーム開始
    openShop(); // ショップを開く
  };

  const handleReset = () => {
    resetRestaurant();
    resetEntities();
    resetMenu();
    resetShop();
    setShowGame(false);
  };

  return (
    <div className="app">
      {/* ショップウィンドウ */}
      <ShopWindow />

      {/* 1日終了ウィンドウ */}
      <DayEndWindow />

      {/* ゲームオーバーウィンドウ */}
      <GameOverWindow onRestart={handleReset} />

      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '6px 20px',
          backgroundColor: '#333',
          color: 'white',
        }}
      >
        {/* 時間ゲージ + ノルマゲージ（中央配置） */}
        <DayClock />
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
            {/* 閉店オーバーレイ（開店前） */}
            {(!gameStarted || !isOpen) && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
          onClick={openShop}
          disabled={!gameStarted}
          style={{
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: gameStarted ? 'pointer' : 'not-allowed',
            backgroundColor: gameStarted ? '#FF9800' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            opacity: gameStarted ? 1 : 0.5,
          }}
        >
          ショップ
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
