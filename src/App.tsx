import { useState } from 'react';
import { RestaurantMap } from './components/RestaurantMap';
import { TitleScreen } from './components/TitleScreen';
import { DayClock } from './components/DayClock';
import { DayEndWindow } from './components/DayEndWindow';
import { GameOverWindow } from './components/GameOverWindow';
import { UpgradeWindow } from './components/UpgradeWindow';
import { MoneyEffects } from './components/MoneyEffects';
import { StatusPanel } from './components/StatusPanel';
import { PreparePhaseScreen } from './components/PreparePhaseScreen';
import { WindowButton, Win98IconButton, Win98LargeButton, CRTOverlay } from './components/ui';
import { useRestaurantStore, useEntityStore, useMenuStore, useShopStore, useStaffStore } from './store';
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
  const { gameStarted, reset: resetMenu, startGame } = useMenuStore();
  const { reset: resetShop } = useShopStore();
  const { reset: resetStaff } = useStaffStore();

  const handleGameStart = () => {
    setShowGame(true);
    startGame();
  };

  const handleReset = () => {
    resetRestaurant();
    resetEntities();
    resetMenu();
    resetShop();
    resetStaff();
    setShowGame(false);
  };

  return (
    <div className="app" style={{ fontFamily: '"DotGothic16", "MS Gothic", monospace' }}>
      {/* CRTモニター風エフェクト */}
      <CRTOverlay />
      {/* 1日終了ウィンドウ */}
      <DayEndWindow />

      {/* ゲームオーバーウィンドウ */}
      <GameOverWindow onRestart={handleReset} />

      {/* 店舗拡張ウィンドウ */}
      <UpgradeWindow />

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
              background: 'linear-gradient(90deg, #8B0000 0%, #CC0000 20%, #FF4500 40%, #FF6600 60%, #FFA500 80%, #FFD700 100%)',
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
              アメリカンダイナーシミュレーター
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {/* ヘルプボタン */}
              <Win98IconButton onClick={() => {}} size={24}>
                ?
              </Win98IconButton>
              {/* 閉じるボタン（無効） */}
              <Win98IconButton disabled size={24}>
                ✕
              </Win98IconButton>
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
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* 準備フェーズ: スタッフ雇用・メニュー選択 */}
            {!isOpen ? (
              <PreparePhaseScreen />
            ) : (
              <>
                <RestaurantMap />
                <MoneyEffects />
                {/* 次の日へオーバーレイ */}
                {canClose && isNormaAchieved() && (
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
                    }}
                  >
                    <Win98LargeButton
                      onClick={triggerClose}
                      color="#008000"
                      variant="inset"
                    >
                      次の日へ
                    </Win98LargeButton>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <TitleScreen onStart={handleGameStart} />
        )}
      </Panel3D>

          {/* ステータスパネル（スタッフ・メニュー・客単価） */}
          <StatusPanel />

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
