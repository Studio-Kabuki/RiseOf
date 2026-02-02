import { useRestaurantStore } from '../store';

// Windows 98 スタイルの3Dパネル
const Panel3D = ({
  children,
  inset = false,
  style = {},
}: {
  children: React.ReactNode;
  inset?: boolean;
  style?: React.CSSProperties;
}) => (
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

export const DayClock = () => {
  const {
    currentDay,
    getDayProgress,
    money,
    currentRent,
    isNormaAchieved,
    lit,
    todayCustomerCount,
    todayRevenue,
  } = useRestaurantStore();
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
  const normaBarHeight = 20;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      {/* 時間制限円形ゲージ（中に閉店ボタン/次の日へ表示） */}
      <div style={{ position: 'relative' }}>
        <svg
          width={timeSize}
          height={timeSize}
          style={{ transform: 'rotate(-90deg)', pointerEvents: 'none' }}
        >
          {/* 背景円 */}
          <circle
            cx={timeSize / 2}
            cy={timeSize / 2}
            r={timeRadius}
            fill="none"
            stroke="#808080"
            strokeWidth={timeStrokeWidth}
          />
          {/* 進捗円 */}
          <circle
            cx={timeSize / 2}
            cy={timeSize / 2}
            r={timeRadius}
            fill="none"
            stroke={progress >= 1 ? (normaAchieved ? '#008000' : '#800000') : '#008542'}
            strokeWidth={timeStrokeWidth}
            strokeDasharray={timeCircumference}
            strokeDashoffset={timeStrokeDashoffset}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dashoffset 0.1s' }}
          />
        </svg>
        {/* 中央のテキスト/ボタン */}
        <div
          style={{
            position: 'absolute',
            top: timeStrokeWidth,
            left: timeStrokeWidth,
            right: timeStrokeWidth,
            bottom: timeStrokeWidth,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '7px', color: '#000000' }}>DAY</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#000080' }}>
              {currentDay}
            </span>
          </div>
        </div>
      </div>

      {/* ノルマゲージと統計 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {/* 売上目標ラベル */}
        <div style={{ fontSize: '10px', color: '#000000', fontWeight: 'bold' }}>
          売上目標
        </div>
        {/* ノルマ進捗バー */}
        <Panel3D
          inset
          style={{
            width: normaBarWidth,
            height: normaBarHeight,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div
            style={{
              width: `${normaProgress * 100}%`,
              height: '100%',
              backgroundColor: normaAchieved ? '#008000' : '#008542',
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
              backgroundColor: '#800000',
            }}
          />
          {/* 金額テキスト（バー上に表示） */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              color: normaProgress > 0.5 ? '#FFFFFF' : '#000000',
              textShadow: normaProgress > 0.5 ? '0 0 2px #000' : 'none',
            }}
          >
            {money}円 / {currentRent}円
          </div>
        </Panel3D>
        {/* 今日の統計 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            fontSize: '10px',
            color: '#000000',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>👤</span>
            <span style={{ fontWeight: 'bold' }}>{todayCustomerCount}人</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>💰</span>
            <span style={{ fontWeight: 'bold' }}>{todayRevenue}円</span>
          </div>
        </div>
      </div>

      {/* LIT表示 */}
      <Panel3D
        inset
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <span style={{ fontSize: '14px' }}>🔥</span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#800000',
          }}
        >
          {lit} LIT
        </span>
      </Panel3D>
    </div>
  );
};
