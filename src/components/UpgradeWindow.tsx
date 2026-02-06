import { useRestaurantStore, useMenuStore, useStaffStore } from '../store';
import { WindowDialog, WindowButton } from './ui';

type UpgradeType = 'table' | 'staff' | 'menu';

interface UpgradeOption {
  type: UpgradeType;
  title: string;
  description: string;
  icon: string;
}

const upgradeOptions: UpgradeOption[] = [
  {
    type: 'table',
    title: 'テーブル解放',
    description: '新しいテーブルを解放',
    icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1fa91.png', // 椅子
  },
  {
    type: 'staff',
    title: '店員枠拡張',
    description: '店員スロットを+1',
    icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9d1-200d-1f373.png', // 料理人
  },
  {
    type: 'menu',
    title: 'メニュー枠拡張',
    description: 'メニュースロットを+1',
    icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4dc.png', // 巻物
  },
];

export function UpgradeWindow() {
  const { showUpgrade, closeUpgrade, unlockNextTable, seatCount, currentDay, tableUnlockLevel, restaurant } = useRestaurantStore();
  const { increaseMaxMenuSlots, maxMenuSlots, openMenuSelect } = useMenuStore();
  const { increaseMaxSlots, maxStaffSlots } = useStaffStore();

  // 解放可能なテーブルがあるか確認
  const hasMoreTables = restaurant.tables.some((t) => t.index !== undefined && t.index > tableUnlockLevel);

  if (!showUpgrade) return null;

  const handleUpgrade = (type: UpgradeType) => {
    switch (type) {
      case 'table':
        unlockNextTable();
        break;
      case 'staff':
        increaseMaxSlots();
        break;
      case 'menu':
        increaseMaxMenuSlots();
        break;
    }
    closeUpgrade();
    openMenuSelect(); // アップグレード後にメニュー選択を開く
  };

  const handleSkip = () => {
    closeUpgrade();
    openMenuSelect();
  };

  return (
    <WindowDialog
      title={`Day ${currentDay} - 店舗拡張`}
      width="450px"
      zIndex={1100}
    >
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#006400', marginBottom: '8px' }}>
          おめでとう！
        </div>
        <div style={{ fontSize: '12px', color: '#333' }}>
          3日ごとの報酬として、店舗を拡張できます。
          <br />
          1つ選んでください！
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        {upgradeOptions.map((option) => {
          const isDisabled = option.type === 'table' && !hasMoreTables;
          return (
          <div
            key={option.type}
            onClick={() => !isDisabled && handleUpgrade(option.type)}
            style={{
              width: '120px',
              padding: '16px 12px',
              backgroundColor: isDisabled ? '#E0E0E0' : '#FFFFFF',
              borderTop: '2px solid #DFDFDF',
              borderLeft: '2px solid #DFDFDF',
              borderBottom: '2px solid #808080',
              borderRight: '2px solid #808080',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              textAlign: 'center',
              transition: 'none',
              opacity: isDisabled ? 0.6 : 1,
            }}
            onMouseDown={(e) => {
              if (isDisabled) return;
              e.currentTarget.style.borderTop = '2px solid #808080';
              e.currentTarget.style.borderLeft = '2px solid #808080';
              e.currentTarget.style.borderBottom = '2px solid #DFDFDF';
              e.currentTarget.style.borderRight = '2px solid #DFDFDF';
            }}
            onMouseUp={(e) => {
              if (isDisabled) return;
              e.currentTarget.style.borderTop = '2px solid #DFDFDF';
              e.currentTarget.style.borderLeft = '2px solid #DFDFDF';
              e.currentTarget.style.borderBottom = '2px solid #808080';
              e.currentTarget.style.borderRight = '2px solid #808080';
            }}
            onMouseLeave={(e) => {
              if (isDisabled) return;
              e.currentTarget.style.borderTop = '2px solid #DFDFDF';
              e.currentTarget.style.borderLeft = '2px solid #DFDFDF';
              e.currentTarget.style.borderBottom = '2px solid #808080';
              e.currentTarget.style.borderRight = '2px solid #808080';
            }}
          >
            <img
              src={option.icon}
              alt={option.title}
              style={{ width: '40px', height: '40px', marginBottom: '8px' }}
            />
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>
              {option.title}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              {option.description}
            </div>
            <div style={{ fontSize: '9px', color: '#999', marginTop: '4px' }}>
              {option.type === 'table' && `現在: ${seatCount}席`}
              {option.type === 'staff' && `現在: ${maxStaffSlots}枠`}
              {option.type === 'menu' && `現在: ${maxMenuSlots}枠`}
            </div>
            {option.type === 'table' && !hasMoreTables && (
              <div style={{ fontSize: '8px', color: '#ff6600', marginTop: '2px' }}>
                (全解放済み)
              </div>
            )}
          </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center' }}>
        <WindowButton onClick={handleSkip} size="small">
          スキップ
        </WindowButton>
      </div>
    </WindowDialog>
  );
}
