import { useRestaurantStore } from '../store';

export const DayClock = () => {
  const { currentDay, getDayProgress } = useRestaurantStore();
  const progress = getDayProgress();

  // 円形ゲージのパラメータ
  const size = 60;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* 円形ゲージ */}
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* 背景円 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#555"
          strokeWidth={strokeWidth}
        />
        {/* 進捗円 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progress >= 1 ? '#ff6b6b' : '#4caf50'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s' }}
        />
      </svg>
      {/* 日数表示 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: '#aaa' }}>DAY</span>
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
          {currentDay}
        </span>
      </div>
    </div>
  );
};
