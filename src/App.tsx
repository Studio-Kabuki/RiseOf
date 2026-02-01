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
  const { registeredMenus, gameStarted, reset: resetMenu, startGame, maxMenuSlots } = useMenuStore();
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

      {/* 全体をウィンドウ風に */}
      <div
        style={{
          backgroundColor: '#C0C0C0',
          borderTop: '2px solid #FFFFFF',
          borderLeft: '2px solid #FFFFFF',
          borderBottom: '2px solid #404040',
          borderRight: '2px solid #404040',
          boxShadow: '1px 1px 0 #000000',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 内側のボーダー */}
        <div
          style={{
            borderTop: '1px solid #DFDFDF',
            borderLeft: '1px solid #DFDFDF',
            borderBottom: '1px solid #808080',
            borderRight: '1px solid #808080',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* タイトルバー */}
          <div
            style={{
              background: 'linear-gradient(90deg, #2E8B57 0%, #3CB371 15%, #66CDAA 35%, #98FB98 55%, #F0FFF0 80%, #FFFFFF 100%)',
              padding: '3px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '2px',
              height: '27px',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px',
                textShadow: '1px 1px 0 rgba(0,0,0,0.3)',
                marginLeft: '2px',
              }}
            >
              イタリアンレストランシミュレーター
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {/* ヘルプボタン */}
              <button
                style={{
                  width: '24px',
                  height: '21px',
                  backgroundColor: '#C0C0C0',
                  borderTop: '2px solid #FFFFFF',
                  borderLeft: '2px solid #FFFFFF',
                  borderBottom: '2px solid #404040',
                  borderRight: '2px solid #404040',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  lineHeight: 1,
                }}
                onClick={() => {}}
              >
                ?
              </button>
              {/* 閉じるボタン（無効） */}
              <button
                disabled
                style={{
                  width: '24px',
                  height: '21px',
                  backgroundColor: '#C0C0C0',
                  borderTop: '2px solid #808080',
                  borderLeft: '2px solid #808080',
                  borderBottom: '2px solid #FFFFFF',
                  borderRight: '2px solid #FFFFFF',
                  color: '#808080',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* ステータスバー（ゲージ表示） */}
          <Panel3D
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 8px',
              margin: '0 2px',
              height: '72px',
              flexShrink: 0,
            }}
          >
            <DayClock />
          </Panel3D>

          {/* ゲームエリア */}
          <Panel3D
            inset
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '8px',
              flex: 1,
              position: 'relative',
              margin: '0 2px',
              overflow: 'hidden',
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
              gap: '4px',
              padding: '4px 8px',
              margin: '2px 2px 0 2px',
              height: '36px',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '11px', color: '#000000', fontWeight: 'bold' }}>
              メニュー:
            </span>
            {Array.from({ length: maxMenuSlots }).map((_, index) => {
              const menu = registeredMenus[index];
              return menu ? (
                <Panel3D
                  key={menu.id}
                  inset
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    backgroundColor: '#FFFFFF',
                    width: '90px',
                    height: '24px',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={menu.iconUrl}
                    alt={menu.name}
                    style={{ width: '20px', height: '20px', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '10px', color: '#000000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{menu.name}</span>
                  <span style={{ fontSize: '9px', color: '#808080', whiteSpace: 'nowrap', flexShrink: 0 }}>{menu.price}円</span>
                </Panel3D>
              ) : (
                <div
                  key={`empty-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 6px',
                    backgroundColor: '#E8E8E8',
                    borderTop: '1px solid #808080',
                    borderLeft: '1px solid #808080',
                    borderBottom: '1px solid #FFFFFF',
                    borderRight: '1px solid #FFFFFF',
                    width: '90px',
                    height: '24px',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                  onClick={openShop}
                >
                  <span style={{ fontSize: '10px', color: '#808080' }}>+ 追加</span>
                </div>
              );
            })}
          </Panel3D>

          {/* コントロールパネル */}
          <Panel3D
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              margin: '2px',
              height: '40px',
              flexShrink: 0,
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
      </div>
    </div>
  );
}

export default App;
