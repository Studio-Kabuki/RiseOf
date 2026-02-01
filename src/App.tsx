import { useEffect, useState } from 'react';
import { useGameStore } from './store';
import { ResourceBar } from './components/ResourceBar';
import { GameMap } from './components/GameMap';
import { ShopCard } from './components/ShopCard';
import { ActionPanel } from './components/ActionPanel';
import { GachaModal } from './components/GachaModal';
import { StaffGachaModal } from './components/StaffGachaModal';
import { StaffPlacementModal } from './components/StaffPlacementModal';
import { GameOverModal } from './components/GameOverModal';
import { loadGameData, setGameData } from './utils/dataLoader';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { shops, selectedShopId, initializeFromCSV } = useGameStore();
  const selectedShop = shops.find(s => s.id === selectedShopId && s.status === 'owned');

  // CSVデータをロード
  useEffect(() => {
    loadGameData()
      .then(data => {
        setGameData(data);
        initializeFromCSV();
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load game data:', err);
        setIsLoading(false);
      });
  }, [initializeFromCSV]);

  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <ResourceBar />

      <div className="game-area">
        <GameMap />

        {selectedShop && (
          <div className="shop-overlay">
            <ShopCard shop={selectedShop} />
          </div>
        )}
      </div>

      <ActionPanel />

      {/* モーダル */}
      <GachaModal />
      <StaffGachaModal />
      <StaffPlacementModal />
      <GameOverModal />
    </div>
  );
}

export default App;
