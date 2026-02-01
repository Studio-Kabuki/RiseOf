import { useMenuStore, useRestaurantStore } from '../store';
import type { MenuItem } from '../types';

// 共通Windows XP風スタイル
const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100, // DayEndWindowより前面
  },
  window: {
    width: '450px',
    backgroundColor: '#ECE9D8',
    border: '2px solid #0054E3',
    borderRadius: '8px 8px 0 0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    fontFamily: 'Tahoma, "MS UI Gothic", sans-serif',
  },
  titleBar: {
    background: 'linear-gradient(180deg, #0A246A 0%, #0054E3 10%, #0054E3 90%, #0A246A 100%)',
    padding: '6px 10px',
    borderRadius: '6px 6px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    color: 'white',
    fontWeight: 'bold' as const,
    fontSize: '13px',
  },
  content: {
    padding: '20px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '16px',
    color: '#333',
    fontSize: '14px',
  },
  optionsContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  menuCard: {
    width: '120px',
    padding: '12px',
    backgroundColor: 'white',
    border: '2px solid #7F9DB9',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'all 0.2s',
  },
  menuCardHover: {
    backgroundColor: '#E1F0FF',
    borderColor: '#003399',
    transform: 'scale(1.05)',
  },
  menuIcon: {
    width: '48px',
    height: '48px',
    marginBottom: '8px',
  },
  menuName: {
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#003399',
    marginBottom: '4px',
  },
  menuPrice: {
    fontSize: '11px',
    color: '#666',
  },
  menuTime: {
    fontSize: '10px',
    color: '#999',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  skipButton: {
    padding: '8px 20px',
    fontSize: '13px',
    cursor: 'pointer',
    backgroundColor: '#9e9e9e',
    color: 'white',
    border: '1px solid #666',
    borderRadius: '4px',
  },
};

interface MenuCardProps {
  menu: MenuItem;
  onSelect: () => void;
}

function MenuCard({ menu, onSelect }: MenuCardProps) {
  return (
    <div
      style={styles.menuCard}
      onClick={onSelect}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, styles.menuCardHover);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.borderColor = '#7F9DB9';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <img src={menu.iconUrl} alt={menu.name} style={styles.menuIcon} />
      <div style={styles.menuName}>{menu.name}</div>
      <div style={styles.menuPrice}>{menu.price}円</div>
      <div style={styles.menuTime}>調理: {menu.cookingTime}秒</div>
    </div>
  );
}

export function MenuSelectionWindow() {
  const {
    isSelectionOpen,
    currentOptions,
    selectMenu,
    closeSelection,
    startGame,
    gameStarted,
  } = useMenuStore();
  const { startNextDay } = useRestaurantStore();

  if (!isSelectionOpen) return null;

  // メニュー選択時
  const handleSelect = (menuId: string) => {
    selectMenu(menuId);
    if (!gameStarted) {
      // 初回：ゲーム開始
      startGame();
    } else {
      // 2回目以降：次の日へ
      startNextDay();
    }
  };

  // スキップ（メニュー追加しない）
  const handleSkip = () => {
    closeSelection();
    if (gameStarted) {
      startNextDay();
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.window}>
        {/* タイトルバー */}
        <div style={styles.titleBar}>
          <span style={styles.titleText}>
            {gameStarted ? 'メニュー追加' : 'メニュー選択'}
          </span>
        </div>

        {/* コンテンツ */}
        <div style={styles.content}>
          <div style={styles.header}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {gameStarted ? '新しいメニューを追加しますか？' : 'メニューを選んでください'}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {gameStarted ? 'クリックで追加 → 次の日へ' : 'クリックで選択 → ゲーム開始'}
            </div>
          </div>

          {/* 選択肢 */}
          <div style={styles.optionsContainer}>
            {currentOptions.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                onSelect={() => handleSelect(menu.id)}
              />
            ))}
          </div>

          {/* スキップボタン（ゲーム開始後のみ） */}
          {gameStarted && (
            <div style={styles.buttonContainer}>
              <button onClick={handleSkip} style={styles.skipButton}>
                スキップして次の日へ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
