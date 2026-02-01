import { useState, useEffect } from 'react';
import { useRestaurantStore, useMenuStore } from '../store';
import { useEntityStore } from '../store/entityStore';

export const DayEndWindow = () => {
  const {
    isDayEnded,
    currentDay,
    money,
    currentRent,
    isGameOver,
    rentPaid,
    payRent,
    startNextDay,
    reset: resetRestaurant,
  } = useRestaurantStore();
  const {
    openSelection,
    closeSelection,
    registeredMenus,
    maxMenuSlots,
    isSelectionOpen,
    reset: resetMenu,
  } = useMenuStore();
  const { reset: resetEntities } = useEntityStore();

  // 家賃支払い状態の管理
  const [hasAttemptedPayment, setHasAttemptedPayment] = useState(false);

  // 日終了時に自動で家賃支払いを試みる
  useEffect(() => {
    if (isDayEnded && !rentPaid && !hasAttemptedPayment && !isGameOver) {
      setHasAttemptedPayment(true);
      payRent();
    }
  }, [isDayEnded, rentPaid, hasAttemptedPayment, isGameOver, payRent]);

  // 新しい日が始まったらリセット
  useEffect(() => {
    if (!isDayEnded) {
      setHasAttemptedPayment(false);
    }
  }, [isDayEnded]);

  // メニュー選択ウィンドウが開いている場合は非表示
  if (!isDayEnded || isSelectionOpen) return null;

  const canAddMenu = registeredMenus.length < maxMenuSlots;
  // 家賃支払い後の残高
  const remainingMoney = rentPaid ? money : money - currentRent;

  const handleAddMenu = () => {
    openSelection();
  };

  const handleNextDay = () => {
    closeSelection(); // メニューダイアログを閉じる
    startNextDay();
  };

  // ゲームオーバー時のリスタート処理
  const handleRestart = () => {
    // 全てのストアをリセット
    resetRestaurant();
    resetMenu();
    resetEntities();
    setHasAttemptedPayment(false);
  };

  // ゲームオーバー画面
  if (isGameOver) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}
      >
        {/* ゲームオーバーウィンドウ */}
        <div
          style={{
            width: '400px',
            backgroundColor: '#ECE9D8',
            border: '2px solid #8B0000',
            borderRadius: '8px 8px 0 0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            fontFamily: 'Tahoma, "MS UI Gothic", sans-serif',
          }}
        >
          {/* タイトルバー（赤色） */}
          <div
            style={{
              background: 'linear-gradient(180deg, #4A0000 0%, #8B0000 10%, #8B0000 90%, #4A0000 100%)',
              padding: '6px 10px',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '13px', color: 'white', fontWeight: 'bold' }}>
              Day {currentDay} - ゲームオーバー
            </span>
          </div>

          {/* コンテンツ */}
          <div style={{ padding: '20px' }}>
            {/* ゲームオーバーメッセージ */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#8B0000',
                  marginBottom: '16px',
                }}
              >
                GAME OVER
              </div>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>
                家賃を支払えませんでした
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                所持金: {money} 円 / 家賃: {currentRent} 円
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                不足額: {currentRent - money} 円
              </div>
            </div>

            {/* リスタートボタン */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={handleRestart}
                style={{
                  padding: '12px 32px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backgroundColor: '#8B0000',
                  color: 'white',
                  border: '1px solid #4A0000',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                }}
              >
                最初からやり直す
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>
              本日の売上
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#006400',
              }}
            >
              {money + currentRent} 円
            </div>
          </div>

          {/* 家賃表示 */}
          <div
            style={{
              backgroundColor: '#FFF0F0',
              border: '1px solid #CC0000',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '12px', color: '#333', marginBottom: '4px' }}>
              本日の家賃（ノルマ）
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#CC0000',
                marginBottom: '8px',
              }}
            >
              -{currentRent} 円
            </div>
            <div
              style={{
                fontSize: '14px',
                color: rentPaid ? '#006400' : '#CC0000',
                fontWeight: 'bold',
              }}
            >
              残高: {remainingMoney} 円
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
