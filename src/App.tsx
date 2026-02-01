import { useState } from 'react';
import { RestaurantMap } from './components/RestaurantMap';
import { TitleScreen } from './components/TitleScreen';
import { DayClock } from './components/DayClock';
import { DayEndWindow } from './components/DayEndWindow';
import { GameOverWindow } from './components/GameOverWindow';
import { ShopWindow } from './components/ShopWindow';
import { WindowButton } from './components/ui';
import { useRestaurantStore, useEntityStore, useMenuStore, useShopStore } from './store';
import './App.css';

// Windows 98 スタイルの3Dパネル
const Panel3D = ({ children, inset = false, style = {} }: { children: React.ReactNode; inset?: boolean; style?: React.CSSProperties }) => (
  <div
    style={{
      backgroundColor: '#C0C0C0',
      borderTop: inset ? '1px solid #808080' : '1px solid #FFFFFF',
      borderLeft: inset ? '1px solid #808080' : '1px solid #FFFFFF',
      borderBottom: inset ? '1px solid #FFFFFF' : '1px solid #808080',
      borderRight: inset ? '1px solid #FFFFFF' : '1px solid #808080',
      ...style,
    }}
  >
    {children}
  </div>
);

function App() {
  const [showGame, setShowGame] = useState(false);
  const { isPaused, togglePause, gameSpeed, cycleSpeed, reset: resetRestaurant, isOpen, canClose, isNormaAchieved, triggerClose } = useRestaurantStore();
  const { reset: resetEntities } = useEntityStore();
  const { registeredMenus, gameStarted, reset: resetMenu, startGame } = useMenuStore();
  const { openShop, reset: resetShop } = useShopStore();

  const handleGameStart = () => {
    setShowGame(true);
    startGame();
    openShop();
  };

  const handleReset = () => {
    resetRestaurant();
    resetEntities();
    resetMenu();
    resetShop();
    setShowGame(false);
  };

  return (
    <div className="app" style={{ fontFamily: 'MS Sans Serif, Tahoma, sans-serif' }}>
      {/* ショップウィンドウ */}
      <ShopWindow />

      {/* 1日終了ウィンドウ */}
      <DayEndWindow />

      {/* ゲームオーバーウィンドウ */}
      <GameOverWindow onRestart={handleReset} />

      {/* ヘッダー（タイトルバー風） */}
      <div
        style={{
          background: 'linear-gradient(90deg, #2E8B57 0%, #3CB371 15%, #66CDAA 35%, #98FB98 55%, #F0FFF0 80%, #FFFFFF 100%)',
          padding: '4px 8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <DayClock />
      </div>

      {/* ゲームエリア */}
      <Panel3D
        inset
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: showGame ? '8px' : '0',
          minHeight: 'calc(100vh - 180px)',
          position: 'relative',
        }}
      >
        {showGame ? (
          <>
            <RestaurantMap />
            {/* 閉店オーバーレイ - 開店ボタン */}
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
                  cursor: 'pointer',
                }}
                onClick={() => useRestaurantStore.getState().openStore()}
              >
                <button
                  style={{
                    backgroundColor: '#C0C0C0',
                    border: 'none',
                    borderTop: '3px solid #FFFFFF',
                    borderLeft: '3px solid #FFFFFF',
                    borderBottom: '3px solid #808080',
                    borderRight: '3px solid #808080',
                    padding: '16px 48px',
                    cursor: 'pointer',
                    fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
                  }}
                >
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#008542' }}>
                    開店する
                  </span>
                </button>
              </div>
            )}
            {/* 次の日へオーバーレイ */}
            {gameStarted && isOpen && canClose && isNormaAchieved() && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={triggerClose}
              >
                <button
                  style={{
                    backgroundColor: '#C0C0C0',
                    border: 'none',
                    borderTop: '3px solid #808080',
                    borderLeft: '3px solid #808080',
                    borderBottom: '3px solid #FFFFFF',
                    borderRight: '3px solid #FFFFFF',
                    padding: '16px 48px',
                    cursor: 'pointer',
                    fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
                  }}
                >
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#008000' }}>
                    次の日へ
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          <TitleScreen onStart={handleGameStart} />
        )}
      </Panel3D>

      {/* メニューバー */}
      <Panel3D
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '4px 16px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#000000', fontWeight: 'bold' }}>
          メニュー:
        </span>
        {registeredMenus.map((menu) => (
          <Panel3D
            key={menu.id}
            inset
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <img
              src={menu.iconUrl}
              alt={menu.name}
              style={{ width: '20px', height: '20px' }}
            />
            <span style={{ fontSize: '11px', color: '#000000' }}>{menu.name}</span>
            <span style={{ fontSize: '10px', color: '#808080' }}>{menu.price}円</span>
          </Panel3D>
        ))}
        {registeredMenus.length === 0 && (
          <span style={{ fontSize: '11px', color: '#808080' }}>
            メニューを選択してください
          </span>
        )}
      </Panel3D>

      {/* コントロールパネル */}
      <Panel3D
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '6px 16px',
        }}
      >
        <WindowButton
          onClick={togglePause}
          disabled={!gameStarted}
        >
          {isPaused ? '▶ 再開' : '⏸ 一時停止'}
        </WindowButton>

        <WindowButton
          onClick={cycleSpeed}
          disabled={!gameStarted}
        >
          x{gameSpeed}
        </WindowButton>

        <WindowButton
          onClick={openShop}
          disabled={!gameStarted}
        >
          ショップ
        </WindowButton>

        <WindowButton onClick={handleReset}>
          リセット
        </WindowButton>
      </Panel3D>
    </div>
  );
}

export default App;
