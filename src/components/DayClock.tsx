import { useRestaurantStore, useMenuStore } from '../store';

export const DayClock = () => {
  const {
    currentDay,
    getDayProgress,
    money,
    currentRent,
    canClose,
    isNormaAchieved,
    triggerClose,
    isOpen,
    openStore,
    lit,
  } = useRestaurantStore();
  const { gameStarted } = useMenuStore();
  const progress = getDayProgress();
  const normaAchieved = isNormaAchieved();
  const normaProgress = Math.min(money / currentRent, 1);

  // 時間制限円形ゲージのパラメータ
  const timeSize = 56;
  const timeStrokeWidth = 6;
  const timeRadius = (timeSize - timeStrokeWidth) / 2;
  const timeCircumference = 2 * Math.PI * timeRadius;
  const timeStrokeDashoffset = timeCircumference * (1 - progress);

  // ノルマゲージのパラメータ（横長バー）
  const normaBarWidth = 200;
  const normaBarHeight = 24;

  const handleClose = () => {
    if (canClose && normaAchieved) {
      triggerClose();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {/* 時間制限円形ゲージ（中に閉店ボタン/次の日へ表示） */}
      <div style={{ position: 'relative' }}>
        <svg
          width={timeSize}
          height={timeSize}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* 背景円 */}
          <circle
            cx={timeSize / 2}
            cy={timeSize / 2}
            r={timeRadius}
            fill="none"
            stroke="#555"
            strokeWidth={timeStrokeWidth}
          />
          {/* 進捗円 */}
          <circle
            cx={timeSize / 2}
            cy={timeSize / 2}
            r={timeRadius}
            fill="none"
            stroke={progress >= 1 ? (normaAchieved ? '#4caf50' : '#ff6b6b') : '#ffa726'}
            strokeWidth={timeStrokeWidth}
            strokeDasharray={timeCircumference}
            strokeDashoffset={timeStrokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.1s' }}
          />
        </svg>
        {/* 中央のテキスト/ボタン */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {gameStarted && !isOpen ? (
            // 閉店中：開店ボタン
            <button
              onClick={openStore}
              style={{
                background: 'linear-gradient(180deg, #ff9800 0%, #f57c00 100%)',
                border: 'none',
                borderRadius: '50%',
                width: timeSize - timeStrokeWidth * 2 - 2,
                height: timeSize - timeStrokeWidth * 2 - 2,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              <span>開店</span>
            </button>
          ) : canClose && normaAchieved ? (
            // 閉店可能：次の日へボタン
            <button
              onClick={handleClose}
              style={{
                background: 'linear-gradient(180deg, #4caf50 0%, #388e3c 100%)',
                border: 'none',
                borderRadius: '50%',
                width: timeSize - timeStrokeWidth * 2 - 2,
                height: timeSize - timeStrokeWidth * 2 - 2,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              <span>次の日へ</span>
            </button>
          ) : (
            // 通常：DAY表示
            <>
              <span style={{ fontSize: '8px', color: '#aaa' }}>DAY</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
                {currentDay}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ノルマゲージ */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {/* ノルマ進捗バー */}
        <div
          style={{
            width: normaBarWidth,
            height: normaBarHeight,
            backgroundColor: '#444',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${normaProgress * 100}%`,
              height: '100%',
              backgroundColor: normaAchieved ? '#4caf50' : '#ff9800',
              transition: 'width 0.2s, background-color 0.2s',
            }}
          />
          {/* ノルマライン（100%位置） */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '2px',
              height: '100%',
              backgroundColor: '#fff',
            }}
          />
        </div>

        {/* 金額表示 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
          }}
        >
          <span style={{ color: normaAchieved ? '#4caf50' : '#ff9800' }}>
            {money}円
          </span>
          <span style={{ color: '#aaa' }}>
            / {currentRent}円
          </span>
        </div>
      </div>

      {/* LIT表示 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          backgroundColor: '#444',
          borderRadius: '12px',
        }}
      >
        <span style={{ fontSize: '14px' }}>🔥</span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#ff9800',
          }}
        >
          {lit}
        </span>
      </div>
    </div>
  );
};
