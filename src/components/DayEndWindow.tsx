import { useRestaurantStore, useMenuStore } from '../store';

export const DayEndWindow = () => {
  const { isDayEnded, currentDay, money, startNextDay } = useRestaurantStore();
  const { openSelection, closeSelection, registeredMenus, maxMenuSlots, isSelectionOpen } = useMenuStore();

  // メニュー選択ウィンドウが開いている場合は非表示
  if (!isDayEnded || isSelectionOpen) return null;

  const canAddMenu = registeredMenus.length < maxMenuSlots;

  const handleAddMenu = () => {
    openSelection();
  };

  const handleNextDay = () => {
    closeSelection(); // メニューダイアログを閉じる
    startNextDay();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      {/* Windows XP風ウィンドウ */}
      <div
        style={{
          width: '400px',
          backgroundColor: '#ECE9D8',
          border: '2px solid #0054E3',
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          fontFamily: 'Tahoma, "MS UI Gothic", sans-serif',
        }}
      >
        {/* タイトルバー */}
        <div
          style={{
            background: 'linear-gradient(180deg, #0A246A 0%, #0054E3 10%, #0054E3 90%, #0A246A 100%)',
            padding: '6px 10px',
            borderRadius: '6px 6px 0 0',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '13px', color: 'white', fontWeight: 'bold' }}>
            Day {currentDay} - 営業終了
          </span>
        </div>

        {/* コンテンツ */}
        <div style={{ padding: '20px' }}>
          {/* 売上表示 */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>
              本日の売上
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#006400',
              }}
            >
              {money} 円
            </div>
          </div>

          {/* メニュー追加オプション */}
          {canAddMenu ? (
            <div
              style={{
                backgroundColor: '#FFFFD0',
                border: '1px solid #DAA520',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '12px', color: '#333', marginBottom: '4px' }}>
                新しいメニューを追加できます！
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                現在: {registeredMenus.length} / {maxMenuSlots} 枠
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#F0F0F0',
                border: '1px solid #999',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '12px', color: '#666' }}>
                メニュー枠がいっぱいです
              </div>
            </div>
          )}

          {/* ボタン */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            {canAddMenu && (
              <button
                onClick={handleAddMenu}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: '1px solid #2E7D32',
                  borderRadius: '4px',
                }}
              >
                + メニュー追加
              </button>
            )}
            <button
              onClick={handleNextDay}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: '#2196F3',
                color: 'white',
                border: '1px solid #1565C0',
                borderRadius: '4px',
              }}
            >
              次の日へ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
