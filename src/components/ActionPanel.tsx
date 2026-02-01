import { useGameStore } from '../store';
import './ActionPanel.css';

export const ActionPanel = () => {
  const { endTurn, selectedShopId, shops } = useGameStore();
  const selectedShop = shops.find(s => s.id === selectedShopId);

  return (
    <div className="action-panel">
      <div className="panel-info">
        {selectedShop ? (
          <span>🏪 {selectedShop.name} を選択中 - スロットをタップして施設を追加</span>
        ) : (
          <span>マップ上の店舗をタップして選択</span>
        )}
      </div>

      <button className="end-turn-button" onClick={endTurn}>
        🌙 ターン終了
      </button>
    </div>
  );
};
