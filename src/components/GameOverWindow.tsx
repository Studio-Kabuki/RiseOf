import { useRestaurantStore } from '../store';
import { WindowDialog, WindowButton } from './ui';

interface GameOverWindowProps {
  onRestart?: () => void;
}

export const GameOverWindow = ({ onRestart }: GameOverWindowProps) => {
  const {
    isGameOver,
    currentDay,
    money,
    currentRent,
  } = useRestaurantStore();

  if (!isGameOver) return null;

  const handleRestart = () => {
    if (onRestart) {
      onRestart();
    }
  };

  const shortage = currentRent - money;

  return (
    <WindowDialog
      title={`Day ${currentDay} - ゲームオーバー`}
      width="400px"
      variant="error"
      zIndex={2000}
    >
      {/* ゲームオーバーメッセージ */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#CC0000',
            marginBottom: '8px',
          }}
        >
          GAME OVER
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          ノルマを達成できませんでした
        </div>
      </div>

      {/* 結果表示 */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #808080',
          borderLeft: '1px solid #808080',
          borderBottom: '1px solid #FFFFFF',
          borderRight: '1px solid #FFFFFF',
          padding: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 0',
            borderBottom: '1px solid #E0E0E0',
          }}
        >
          <span style={{ fontSize: '12px', color: '#666' }}>売上</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#006400' }}>
            {money} 円
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 0',
            borderBottom: '1px solid #E0E0E0',
          }}
        >
          <span style={{ fontSize: '12px', color: '#666' }}>ノルマ</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#CC0000' }}>
            {currentRent} 円
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 0',
          }}
        >
          <span style={{ fontSize: '12px', color: '#666' }}>不足額</span>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#CC0000' }}>
            -{shortage} 円
          </span>
        </div>
      </div>

      {/* リスタートボタン */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <WindowButton onClick={handleRestart} size="large">
          最初からやり直す
        </WindowButton>
      </div>
    </WindowDialog>
  );
};
