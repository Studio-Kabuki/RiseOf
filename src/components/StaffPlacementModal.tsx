import { useGameStore } from '../store';
import { getStaff, ATTRIBUTE_NAMES } from '../data';
import './GachaModal.css';

export const StaffPlacementModal = () => {
  const { staffPlacement, staffInventory, placeStaff, closeStaffPlacement, shops } = useGameStore();
  const { isOpen, targetShopId } = staffPlacement;

  if (!isOpen || !targetShopId) return null;

  const targetShop = shops.find(s => s.id === targetShopId);

  return (
    <div className="modal-overlay">
      <div className="modal-content gacha-modal">
        <h2>人材を配置</h2>
        <p className="gacha-description">
          {targetShop?.name}に配置する人材を選んでください
        </p>

        <div className="gacha-choices">
          {staffInventory.map((staffId, index) => {
            const staff = getStaff(staffId);
            if (!staff) return null;

            return (
              <div
                key={`${staffId}-${index}`}
                className={`gacha-choice rarity-${staff.rarity}`}
                onClick={() => placeStaff(staffId)}
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
            );
          })}
        </div>

        <button className="close-btn" onClick={closeStaffPlacement}>
          キャンセル
        </button>
      </div>
    </div>
  );
};
