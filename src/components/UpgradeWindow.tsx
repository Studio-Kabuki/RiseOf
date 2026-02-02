import { useRestaurantStore, useMenuStore, useStaffStore } from '../store';
import { WindowDialog, WindowButton } from './ui';

type UpgradeType = 'seat' | 'staff' | 'menu';

interface UpgradeOption {
  type: UpgradeType;
  title: string;
  description: string;
  icon: string;
}

const upgradeOptions: UpgradeOption[] = [
  {
    type: 'seat',
    title: 'テーブル追加',
    description: '新しいテーブル（4席）を追加',
    icon: 'https://img.icons8.com/fluency/48/dining-table.png',
  },
  {
    type: 'staff',
    title: '店員枠拡張',
    description: '店員スロットを+1',
    icon: 'https://img.icons8.com/fluency/48/waiter.png',
  },
  {
    type: 'menu',
    title: 'メニュー枠拡張',
    description: 'メニュースロットを+1',
    icon: 'https://img.icons8.com/fluency/48/menu.png',
  },
];

export function UpgradeWindow() {
  const { showUpgrade, closeUpgrade, addSeat, seatCount, currentDay } = useRestaurantStore();
  const { increaseMaxMenuSlots, maxMenuSlots, openMenuSelect } = useMenuStore();
  const { increaseMaxSlots, maxStaffSlots } = useStaffStore();

  if (!showUpgrade) return null;

  const handleUpgrade = (type: UpgradeType) => {
    switch (type) {
      case 'seat':
        addSeat();
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
        {upgradeOptions.map((option) => (
          <div
            key={option.type}
            onClick={() => handleUpgrade(option.type)}
            style={{
              width: '120px',
              padding: '16px 12px',
              backgroundColor: '#FFFFFF',
              borderTop: '2px solid #DFDFDF',
              borderLeft: '2px solid #DFDFDF',
              borderBottom: '2px solid #808080',
              borderRight: '2px solid #808080',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'none',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.borderTop = '2px solid #808080';
              e.currentTarget.style.borderLeft = '2px solid #808080';
              e.currentTarget.style.borderBottom = '2px solid #DFDFDF';
              e.currentTarget.style.borderRight = '2px solid #DFDFDF';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.borderTop = '2px solid #DFDFDF';
              e.currentTarget.style.borderLeft = '2px solid #DFDFDF';
              e.currentTarget.style.borderBottom = '2px solid #808080';
              e.currentTarget.style.borderRight = '2px solid #808080';
            }}
            onMouseLeave={(e) => {
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
              {option.type === 'seat' && `現在: ${seatCount}席`}
              {option.type === 'staff' && `現在: ${maxStaffSlots}枠`}
              {option.type === 'menu' && `現在: ${maxMenuSlots}枠`}
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <WindowButton onClick={handleSkip} size="small">
          スキップ
        </WindowButton>
      </div>
    </WindowDialog>
  );
}
