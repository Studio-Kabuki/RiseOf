import { useGameStore } from '../store';
import './GachaModal.css';

export const GachaModal = () => {
  const { gacha, selectGachaChoice, closeGacha } = useGameStore();

  if (!gacha.isOpen) return null;

  const formatIncome = (income: { money?: number; lit?: number }) => {
    const parts: string[] = [];
    if (income.money) parts.push(`💰+${income.money}`);
    if (income.lit) parts.push(`🔥+${income.lit}`);
    return parts.join(' ');
  };

  const getRarityClass = (rarity: string) => {
    switch (rarity) {
      case 'epic': return 'rarity-epic';
      case 'rare': return 'rarity-rare';
      default: return 'rarity-common';
    }
  };

  return (
    <div className="gacha-overlay" onClick={closeGacha}>
      <div className="gacha-modal" onClick={e => e.stopPropagation()}>
        <h2 className="gacha-title">🎰 ガチャ結果</h2>
        <p className="gacha-subtitle">1つ選んでください</p>

        <div className="gacha-choices">
          {gacha.choices.map((facility) => (
            <div
              key={facility.id}
              className={`gacha-choice ${getRarityClass(facility.rarity)}`}
              onClick={() => selectGachaChoice(facility.id)}
            >
              <div className="choice-rarity">{facility.rarity.toUpperCase()}</div>
              <img src={facility.icon} alt={facility.name} className="choice-icon" />
              <div className="choice-name">{facility.name}</div>
              <div className="choice-income">{formatIncome(facility.income)}/日</div>
            </div>
          ))}
        </div>

        <button className="gacha-cancel" onClick={closeGacha}>
          キャンセル（LIT返却なし）
        </button>
      </div>
    </div>
  );
};
