import { useGameStore } from '../store';
import { ATTRIBUTE_NAMES } from '../data';
import './GachaModal.css';

export const StaffGachaModal = () => {
  const { staffGacha, selectStaffGachaChoice, closeStaffGacha } = useGameStore();
  const { isOpen, choices } = staffGacha;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content gacha-modal">
        <h2>人材ガチャ</h2>
        <p className="gacha-description">
          ノルマ達成おめでとうございます！<br />
          人材を1人選んでください（インベントリに追加されます）
        </p>

        <div className="gacha-choices">
          {choices.map((staff) => (
            <div
              key={staff.id}
              className={`gacha-choice rarity-${staff.rarity}`}
              onClick={() => selectStaffGachaChoice(staff.id)}
            >
              <img src={staff.icon} alt={staff.name} className="choice-icon" />
              <div className="choice-info">
                <span className="choice-name">{staff.name}</span>
                <span className="choice-effect">
                  {staff.effectType === 'shop_money_mult' && `店舗の💰×${staff.effectValue}`}
                  {staff.effectType === 'shop_lit_mult' && `店舗の🔥×${staff.effectValue}`}
                  {staff.effectType === 'attribute_money_mult' && staff.targetAttribute &&
                    `${ATTRIBUTE_NAMES[staff.targetAttribute]}の💰×${staff.effectValue}`}
                  {staff.effectType === 'attribute_lit_mult' && staff.targetAttribute &&
                    `${ATTRIBUTE_NAMES[staff.targetAttribute]}の🔥×${staff.effectValue}`}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button className="close-btn" onClick={closeStaffGacha}>
          スキップ
        </button>
      </div>
    </div>
  );
};
