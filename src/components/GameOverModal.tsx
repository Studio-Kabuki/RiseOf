import { useGameStore } from '../store';
import './GameOverModal.css';

export const GameOverModal = () => {
  const { isGameOver, day, normaCount, resetGame } = useGameStore();

  if (!isGameOver) return null;

  return (
    <div className="gameover-overlay">
      <div className="gameover-modal">
        <h1 className="gameover-title">💀 GAME OVER</h1>
        <p className="gameover-message">資金が底をつきました...</p>

        <div className="gameover-stats">
          <div className="stat">
            <span className="stat-label">到達日数</span>
            <span className="stat-value">{day}日</span>
          </div>
          <div className="stat">
            <span className="stat-label">支払ったノルマ</span>
            <span className="stat-value">{normaCount}回</span>
          </div>
        </div>

        <button className="restart-button" onClick={resetGame}>
          🔄 もう一度プレイ
        </button>
      </div>
    </div>
  );
};
