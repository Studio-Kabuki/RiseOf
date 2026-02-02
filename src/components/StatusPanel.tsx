import { useState, useEffect, useRef, useCallback } from 'react';
import { useMenuStore } from '../store/menuStore';
import { useStaffStore } from '../store/staffStore';
import { useRestaurantStore } from '../store/restaurantStore';
import { useShopStore } from '../store/shopStore';

// ファンファーレ演出の状態
type FanfarePhase = 'idle' | 'animating' | 'waiting' | 'complete';

interface FanfareState {
  phase: FanfarePhase;
  currentMenuIndex: number;
  currentStaffIndex: number;
  menuBonuses: Record<number, number>; // { menuIndex: bonusAmount }
  displayedTotal: number;
  glowingStaffId: string | null;
  glowingMenuIndex: number | null;
}

// Windows 98 スタイルの3Dパネル
const Panel3D = ({ children, inset = false, style = {} }: { children: React.ReactNode; inset?: boolean; style?: React.CSSProperties }) => (
  <div
    style={{
      backgroundColor: '#C0C0C0',
      borderTop: inset ? '1px solid #808080' : '1px solid #FFFFFF',
      borderLeft: inset ? '1px solid #808080' : '1px solid #FFFFFF',
      borderBottom: inset ? '1px solid #FFFFFF' : '1px solid #808080',
      borderRight: inset ? '1px solid #FFFFFF' : '1px solid #808080',
      ...style,
    }}
  >
    {children}
  </div>
);

const FANFARE_GLOW_DURATION = 500; // 光る演出時間(ms)
const FANFARE_STEP_DELAY = 200; // 次のステップまでの遅延(ms)

export function StatusPanel() {
  const { registeredMenus, maxMenuSlots } = useMenuStore();
  const { hiredStaff, baseBonuses, categoryBonuses } = useStaffStore();
  const { isOpen } = useRestaurantStore();
  const { openShop } = useShopStore();

  const [fanfare, setFanfare] = useState<FanfareState>({
    phase: 'idle',
    currentMenuIndex: 0,
    currentStaffIndex: 0,
    menuBonuses: {},
    displayedTotal: 0,
    glowingStaffId: null,
    glowingMenuIndex: null,
  });

  const timeoutRef = useRef<number | null>(null);
  const prevIsOpen = useRef(isOpen);

  // 開店時にファンファーレを開始
  useEffect(() => {
    if (isOpen && !prevIsOpen.current && registeredMenus.length > 0) {
      setFanfare({
        phase: 'animating',
        currentMenuIndex: 0,
        currentStaffIndex: 0,
        menuBonuses: {},
        displayedTotal: 0,
        glowingStaffId: null,
        glowingMenuIndex: null,
      });
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, registeredMenus.length]);

  // ファンファーレ進行（animatingフェーズのみ処理）
  useEffect(() => {
    if (fanfare.phase !== 'animating') return;

    const { currentMenuIndex, currentStaffIndex, menuBonuses } = fanfare;
    const menu = registeredMenus[currentMenuIndex];

    if (!menu) {
      // 全メニュー完了
      setFanfare(prev => ({ ...prev, phase: 'complete' }));
      return;
    }

    const menuCategory = menu.params?.category as string | undefined;

    // スタッフを順に確認
    for (let i = currentStaffIndex; i < hiredStaff.length; i++) {
      const staff = hiredStaff[i];
      const staffCategory = staff.params?.category as string | undefined;

      // カテゴリが一致しない場合はスキップ
      if (!menuCategory || !staffCategory || menuCategory !== staffCategory) continue;

      // ボーナスを計算
      let bonusAmount = 0;
      if (staff.ability === 'base_bonus') {
        bonusAmount = (staff.params.value as number) || 0;
      } else if (staff.ability === 'category_bonus') {
        const multiplier = (staff.params.multiplier as number) || 1;
        const currentPrice = menu.price + (menuBonuses[currentMenuIndex] || 0);
        bonusAmount = Math.floor(currentPrice * (multiplier - 1));
      }

      if (bonusAmount > 0) {
        // 光らせる演出を開始 → waitingフェーズへ
        setFanfare(prev => ({
          ...prev,
          phase: 'waiting',
          glowingStaffId: staff.id,
          glowingMenuIndex: currentMenuIndex,
        }));

        // 演出後にボーナスを適用して次へ
        timeoutRef.current = window.setTimeout(() => {
          setFanfare(prev => {
            const newBonuses = { ...prev.menuBonuses };
            newBonuses[currentMenuIndex] = (newBonuses[currentMenuIndex] || 0) + bonusAmount;
            return {
              ...prev,
              phase: 'animating',
              currentStaffIndex: i + 1,
              menuBonuses: newBonuses,
              glowingStaffId: null,
              glowingMenuIndex: null,
            };
          });
        }, FANFARE_GLOW_DURATION);

        return; // このuseEffect終了、タイマーでstate更新後に再度呼ばれる
      }
    }

    // このメニューにボーナスを適用するスタッフがもういない → 次のメニューへ
    const menuTotal = menu.price + (menuBonuses[currentMenuIndex] || 0);

    timeoutRef.current = window.setTimeout(() => {
      setFanfare(prev => ({
        ...prev,
        currentMenuIndex: currentMenuIndex + 1,
        currentStaffIndex: 0,
        displayedTotal: prev.displayedTotal + menuTotal,
      }));
    }, FANFARE_STEP_DELAY);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fanfare.phase, fanfare.currentMenuIndex, fanfare.currentStaffIndex, registeredMenus, hiredStaff]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 客単価を計算
  const calculateTotal = useCallback(() => {
    if (fanfare.phase === 'animating' || fanfare.phase === 'waiting') {
      return fanfare.displayedTotal;
    }
    // 通常時/完了時：全メニューの合計（スタッフボーナス込み）
    return registeredMenus.reduce((sum, menu) => {
      const category = menu.params?.category as string | undefined;
      let price = menu.price;
      if (category) {
        price += baseBonuses[category] || 0;
        price = Math.floor(price * (categoryBonuses[category] || 1));
      }
      return sum + price;
    }, 0);
  }, [fanfare.phase, fanfare.displayedTotal, registeredMenus, baseBonuses, categoryBonuses]);

  // メニューの表示価格を計算
  const getMenuDisplayPrice = useCallback((index: number) => {
    const menu = registeredMenus[index];
    if (!menu) return 0;

    if (fanfare.phase === 'animating' || fanfare.phase === 'waiting') {
      // ファンファーレ中は演出用のボーナスを使用
      return menu.price + (fanfare.menuBonuses[index] || 0);
    }
    // 通常時は実際のボーナスを使用
    const category = menu.params?.category as string | undefined;
    let price = menu.price;
    if (category) {
      price += baseBonuses[category] || 0;
      price = Math.floor(price * (categoryBonuses[category] || 1));
    }
    return price;
  }, [fanfare.phase, fanfare.menuBonuses, registeredMenus, baseBonuses, categoryBonuses]);

  const getMenuBonus = useCallback((index: number) => {
    const menu = registeredMenus[index];
    if (!menu) return 0;

    if (fanfare.phase === 'animating' || fanfare.phase === 'waiting') {
      return fanfare.menuBonuses[index] || 0;
    }
    const category = menu.params?.category as string | undefined;
    if (!category) return 0;

    const baseBonus = baseBonuses[category] || 0;
    const categoryMult = categoryBonuses[category] || 1;
    return Math.floor((menu.price + baseBonus) * categoryMult) - menu.price;
  }, [fanfare.phase, fanfare.menuBonuses, registeredMenus, baseBonuses, categoryBonuses]);

  return (
    <Panel3D
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '6px 8px',
        margin: '2px 2px 0 2px',
        minHeight: '80px',
        flexShrink: 0,
      }}
    >
      {/* 上段：スタッフ + 客単価 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#000000', fontWeight: 'bold', flexShrink: 0 }}>
          スタッフ:
        </span>
        <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          {hiredStaff.map((staff) => {
            const isGlowing = fanfare.glowingStaffId === staff.id;
            return (
              <Panel3D
                key={staff.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 6px',
                  backgroundColor: isGlowing ? '#FFFFC0' : '#FFFFFF',
                  borderTop: isGlowing ? '1px solid #FFD700' : undefined,
                  borderLeft: isGlowing ? '1px solid #FFD700' : undefined,
                  borderBottom: isGlowing ? '1px solid #B8860B' : undefined,
                  borderRight: isGlowing ? '1px solid #B8860B' : undefined,
                  animation: isGlowing ? 'statusGlow 0.5s ease-in-out' : undefined,
                }}
                inset
              >
                <img src={staff.iconUrl} alt={staff.name} style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 10, color: '#000000' }}>{staff.name}</span>
              </Panel3D>
            );
          })}
          {hiredStaff.length === 0 && (
            <span style={{ fontSize: 10, color: '#808080' }}>なし</span>
          )}
        </div>
        {/* 客単価 */}
        <Panel3D
          inset
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            backgroundColor: '#E8F5E9',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: '#000000' }}>客単価:</span>
          <span style={{ fontSize: 14, fontWeight: 'bold', color: '#008000' }}>
            {calculateTotal()}円
          </span>
        </Panel3D>
      </div>

      {/* 下段：メニュー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#000000', fontWeight: 'bold', flexShrink: 0 }}>
          メニュー:
        </span>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {Array.from({ length: maxMenuSlots }).map((_, index) => {
            const menu = registeredMenus[index];
            const displayPrice = getMenuDisplayPrice(index);
            const bonus = getMenuBonus(index);
            const isGlowing = fanfare.glowingMenuIndex === index;

            return menu ? (
              <Panel3D
                key={menu.id}
                inset
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 6px',
                  backgroundColor: isGlowing ? '#FFFFC0' : '#FFFFFF',
                  width: 110,
                  height: 28,
                  overflow: 'hidden',
                  borderTop: isGlowing ? '1px solid #FFD700' : undefined,
                  borderLeft: isGlowing ? '1px solid #FFD700' : undefined,
                  borderBottom: isGlowing ? '1px solid #B8860B' : undefined,
                  borderRight: isGlowing ? '1px solid #B8860B' : undefined,
                  animation: isGlowing ? 'statusGlow 0.5s ease-in-out' : undefined,
                }}
              >
                <img src={menu.iconUrl} alt={menu.name} style={{ width: 22, height: 22, flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 10, color: '#000000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {menu.name}
                  </div>
                  <div style={{ fontSize: 9, color: bonus > 0 ? '#008000' : '#808080', fontWeight: bonus > 0 ? 'bold' : 'normal' }}>
                    {displayPrice}円
                    {bonus > 0 && <span style={{ color: '#800000', marginLeft: 2 }}>(+{bonus})</span>}
                  </div>
                </div>
              </Panel3D>
            ) : (
              <div
                key={`empty-${index}`}
                onClick={openShop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px 6px',
                  backgroundColor: '#E8E8E8',
                  borderTop: '1px solid #808080',
                  borderLeft: '1px solid #808080',
                  borderBottom: '1px solid #FFFFFF',
                  borderRight: '1px solid #FFFFFF',
                  width: 110,
                  height: 28,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ fontSize: 10, color: '#808080' }}>+ 追加</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSSアニメーション */}
      <style>{`
        @keyframes statusGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.4); }
        }
      `}</style>
    </Panel3D>
  );
}
