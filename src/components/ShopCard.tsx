import type { Shop } from '../types';
import { useGameStore } from '../store';
import { getFacility, getStaff, ATTRIBUTE_NAMES } from '../data';
import './ShopCard.css';

type Props = {
  shop: Shop;
};

export const ShopCard = ({ shop }: Props) => {
  const {
    openGacha, removeSlot, removeStaff, openStaffPlacement,
    canAfford, getCurrentGachaCost, staffInventory
  } = useGameStore();
  const currentGachaCost = getCurrentGachaCost();

  const handleSlotClick = (slotIndex: number) => {
    if (shop.slots[slotIndex] !== null) return;
    if (!canAfford({ lit: currentGachaCost })) return;
    openGacha(shop.id, slotIndex);
  };

  const handleRemove = (slotIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSlot(shop.id, slotIndex);
  };

  const handleRemoveStaff = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeStaff(shop.id);
  };

  const handleOpenStaffPlacement = () => {
    openStaffPlacement(shop.id);
  };

  // 人材情報を取得
  const staffDef = shop.staff ? getStaff(shop.staff.staffId) : null;
  const hasStaffInInventory = staffInventory.length > 0;

  const renderSlot = (slot: typeof shop.slots[0], index: number) => {
    if (!slot) {
      const affordable = canAfford({ lit: currentGachaCost });
      return (
        <div
          key={index}
          className={`slot empty ${affordable ? 'clickable' : 'disabled'}`}
          onClick={() => handleSlotClick(index)}
        >
          <span className="slot-plus">+</span>
          <span className="slot-cost">🔥 {currentGachaCost}</span>
        </div>
      );
    }

    const facility = getFacility(slot.facilityId);
    if (!facility) return null;

    // 人材効果による倍率を計算
    let moneyMult = 1;
    let litMult = 1;
    if (staffDef) {
      if (staffDef.effectType === 'attribute_money_mult' &&
          staffDef.targetAttribute === facility.attribute) {
        moneyMult = staffDef.effectValue;
      }
      if (staffDef.effectType === 'attribute_lit_mult' &&
          staffDef.targetAttribute === facility.attribute) {
        litMult = staffDef.effectValue;
      }
    }

    const baseMoney = facility.income.money ?? 0;
    const baseLit = facility.income.lit ?? 0;
    const boostedMoney = Math.floor(baseMoney * moneyMult);
    const boostedLit = Math.floor(baseLit * litMult);

    return (
      <div key={index} className={`slot filled rarity-${facility.rarity}`}>
        <img src={facility.icon} alt={facility.name} className="slot-icon" />
        <div className="slot-info">
          <span className="slot-name">
            {facility.name}
            {facility.attribute !== 'none' && (
              <span className={`attribute-badge attr-${facility.attribute}`}>
                {ATTRIBUTE_NAMES[facility.attribute]}
              </span>
            )}
          </span>
          <span className="slot-income">
            {boostedMoney > 0 && (
              <span className={moneyMult > 1 ? 'boosted' : ''}>
                💰+{boostedMoney}
                {moneyMult > 1 && <span className="mult-indicator">×{moneyMult}</span>}
              </span>
            )}
            {boostedLit > 0 && (
              <span className={litMult > 1 ? 'boosted' : ''}>
                {' '}🔥+{boostedLit}
                {litMult > 1 && <span className="mult-indicator">×{litMult}</span>}
              </span>
            )}
          </span>
        </div>
        <button
          className="slot-remove"
          onClick={(e) => handleRemove(index, e)}
          title="削除"
        >
          ✕
        </button>
      </div>
    );
  };

  const renderStaffSlot = () => {
    if (!staffDef) {
      return (
        <div className="staff-slot empty">
          <span className="staff-empty-text">人材なし</span>
          {hasStaffInInventory ? (
            <button className="staff-place-btn" onClick={handleOpenStaffPlacement}>
              配置する ({staffInventory.length}人)
            </button>
          ) : (
            <span className="staff-hint">ノルマ達成で獲得</span>
          )}
        </div>
      );
    }

    return (
      <div className={`staff-slot filled rarity-${staffDef.rarity}`}>
        <img src={staffDef.icon} alt={staffDef.name} className="staff-icon" />
        <div className="staff-info">
          <span className="staff-name">{staffDef.name}</span>
          <span className="staff-effect">
            {staffDef.effectType === 'shop_money_mult' && `店舗💰×${staffDef.effectValue}`}
            {staffDef.effectType === 'shop_lit_mult' && `店舗🔥×${staffDef.effectValue}`}
            {staffDef.effectType === 'attribute_money_mult' && staffDef.targetAttribute &&
              `${ATTRIBUTE_NAMES[staffDef.targetAttribute]}💰×${staffDef.effectValue}`}
            {staffDef.effectType === 'attribute_lit_mult' && staffDef.targetAttribute &&
              `${ATTRIBUTE_NAMES[staffDef.targetAttribute]}🔥×${staffDef.effectValue}`}
          </span>
        </div>
        <div className="staff-actions">
          {hasStaffInInventory && (
            <button
              className="staff-swap-btn"
              onClick={handleOpenStaffPlacement}
              title="交代"
            >
              交代
            </button>
          )}
          <button
            className="slot-remove"
            onClick={handleRemoveStaff}
            title="解除（インベントリに戻す）"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="shop-card">
      <div className="shop-header">
        <img
          src="https://img.icons8.com/color/48/shop.png"
          alt="shop"
          className="shop-icon"
        />
        <span className="shop-name">{shop.name}</span>
      </div>

      {/* 人材スロット */}
      <div className="staff-section">
        <div className="section-label">人材</div>
        {renderStaffSlot()}
      </div>

      {/* メニュースロット */}
      <div className="menu-section">
        <div className="section-label">メニュー</div>
        <div className="shop-slots">
          {shop.slots.map((slot, i) => renderSlot(slot, i))}
        </div>
      </div>
    </div>
  );
};
