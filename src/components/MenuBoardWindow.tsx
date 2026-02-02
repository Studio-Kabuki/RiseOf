import { useEffect, useRef, useCallback, useState } from 'react';
import { useMenuStore } from '../store/menuStore';
import { useStaffStore } from '../store/staffStore';
import { useRestaurantStore } from '../store/restaurantStore';
import { useMenuBoardStore, type SynergyEvent } from '../store/menuBoardStore';
import { WindowDialog, WindowButton } from './ui';
import type { MenuItem } from '../types/menu';

// アニメーション設定
const MENU_APPEAR_DELAY = 600; // メニュー1つあたりの表示間隔(ms)
const SYNERGY_DISPLAY_TIME = 800; // シナジー演出時間(ms)
const PRICE_ANIMATION_DURATION = 500; // 価格ドゥルルアニメーション時間(ms)
const PRICE_ANIMATION_STEPS = 15; // アニメーションのステップ数

// bonusTextから加算値を抽出（「+50円」→50、「×2倍」→乗算は別処理）
function parseBonusValue(bonusText: string, basePrice: number): number {
  // 加算パターン: +50円
  const addMatch = bonusText.match(/\+(\d+)/);
  if (addMatch) {
    return parseInt(addMatch[1], 10);
  }
  // 乗算パターン: ×2倍
  const multMatch = bonusText.match(/×([\d.]+)/);
  if (multMatch) {
    const multiplier = parseFloat(multMatch[1]);
    return Math.floor(basePrice * (multiplier - 1)); // 増加分のみ
  }
  return 0;
}

// シナジー判定：メニュー追加時にどのスタッフが発動するか
function checkMenuSynergies(
  menu: MenuItem,
  displayedMenus: MenuItem[],
  staff: ReturnType<typeof useStaffStore.getState>
): SynergyEvent[] {
  const events: SynergyEvent[] = [];
  const menuCategory = menu.params?.category as string | undefined;
  const menuIndex = displayedMenus.length; // 今表示するメニューのインデックス

  // 1. カテゴリボーナス系スタッフ（ピザシナジー等）- 乗算と加算両方
  for (const s of staff.hiredStaff) {
    if (s.ability === 'category_bonus') {
      const staffCategory = s.params.category as string;
      if (menuCategory && menuCategory === staffCategory) {
        const multiplier = s.params.multiplier as number;
        events.push({
          staffId: s.id,
          staffName: s.name,
          staffIcon: s.iconUrl,
          bonusText: `×${multiplier}倍`,
          triggeredBy: 'menu',
          menuIndex, // メニュー側の演出用
          priority: s.params.priority as number || 0,
        });
      }
    }
    // 加算ボーナス（base_bonus）
    if (s.ability === 'base_bonus') {
      const staffCategory = s.params.category as string;
      if (menuCategory && menuCategory === staffCategory) {
        const value = s.params.value as number;
        events.push({
          staffId: s.id,
          staffName: s.name,
          staffIcon: s.iconUrl,
          bonusText: `+${value}円`,
          triggeredBy: 'menu',
          menuIndex,
          priority: s.params.priority as number || 10, // 加算は優先度高め
        });
      }
    }
  }

  // 2. カテゴリ数ボーナス（セット割引、フルコース）
  // 現在のメニュー＋表示済みメニューでカテゴリ数を計算
  const allMenus = [...displayedMenus, menu];
  const categories = new Set<string>();
  for (const m of allMenus) {
    const cat = m.params?.category as string | undefined;
    if (cat) categories.add(cat);
  }
  const categoryCount = categories.size;

  for (const s of staff.hiredStaff) {
    if (s.ability === 'set_bonus' || s.ability === 'full_course') {
      const required = (s.params.requiredCategories as number) || (s.ability === 'full_course' ? 3 : 2);
      const value = s.params.value as number;

      // このメニューで初めて条件を満たした場合のみ発動
      const prevCategories = new Set<string>();
      for (const m of displayedMenus) {
        const cat = m.params?.category as string | undefined;
        if (cat) prevCategories.add(cat);
      }

      if (categoryCount >= required && prevCategories.size < required) {
        events.push({
          staffId: s.id,
          staffName: s.name,
          staffIcon: s.iconUrl,
          bonusText: `+${value}円`,
          triggeredBy: 'category_count',
          menuIndex: displayedMenus.length,
        });
      }
    }
  }

  return events;
}

export function MenuBoardWindow() {
  const { registeredMenus, maxMenuSlots } = useMenuStore();
  const staffStore = useStaffStore();
  const {
    isOpen,
    animationPhase,
    displayedMenuCount,
    currentSynergy,
    showNextMenu,
    addSynergyEvent,
    showNextSynergy,
    completeSynergy,
    completeAnimation,
    completeTotalAnimation,
    closeBoard,
  } = useMenuBoardStore();

  const animationTimeoutRef = useRef<number | null>(null);
  const synergyTimeoutRef = useRef<number | null>(null); // シナジー演出用（別管理）
  const priceAnimationRef = useRef<number | null>(null); // 価格アニメーション用
  const totalAnimationRef = useRef<number | null>(null); // 客単価アニメーション用
  const menuBonusesRef = useRef<Record<number, number>>({}); // ボーナス値追跡用（無限ループ防止）
  const [glowingStaffIds, setGlowingStaffIds] = useState<Set<string>>(new Set());
  // 各メニューの累積ボーナス表示値 { menuIndex: displayedBonus }
  const [menuBonuses, setMenuBonuses] = useState<Record<number, number>>({});
  // 客単価演出用
  const [displayedTotal, setDisplayedTotal] = useState<number>(0);
  const [showTotalBurst, setShowTotalBurst] = useState<boolean>(false);

  // 表示するメニュースロット（最大6枠）
  const slots = Array.from({ length: Math.max(6, maxMenuSlots) }, (_, i) => {
    if (i < displayedMenuCount && i < registeredMenus.length) {
      return registeredMenus[i];
    }
    return null;
  });

  // メニューを1つずつ表示するアニメーション
  const advanceAnimation = useCallback(() => {
    if (animationPhase !== 'showing_menu') return;

    // 最新の状態を取得
    const latestMenuState = useMenuStore.getState();
    const latestStaffState = useStaffStore.getState();
    const currentMenus = latestMenuState.registeredMenus;

    const nextIndex = displayedMenuCount;
    if (nextIndex >= currentMenus.length) {
      // 全メニュー表示完了
      completeAnimation();
      return;
    }

    // 次のメニューを表示
    showNextMenu();

    // シナジー判定
    const menu = currentMenus[nextIndex];
    const displayedMenus = currentMenus.slice(0, nextIndex);
    const synergies = checkMenuSynergies(menu, displayedMenus, latestStaffState);

    if (synergies.length > 0) {
      // 優先度順にソート（高い方が先）して演出開始
      const sortedSynergies = [...synergies].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      for (const syn of sortedSynergies) {
        addSynergyEvent(syn);
      }
      // 少し待ってからシナジー演出開始（別refで管理してクリーンアップ干渉を防ぐ）
      synergyTimeoutRef.current = window.setTimeout(() => {
        synergyTimeoutRef.current = null;
        showNextSynergy();
      }, 300);
    } else {
      // シナジーなし、次のメニューへ
      animationTimeoutRef.current = window.setTimeout(() => {
        animationTimeoutRef.current = null; // タイマー完了後にリセット
        advanceAnimation();
      }, MENU_APPEAR_DELAY);
    }
  }, [
    animationPhase,
    displayedMenuCount,
    showNextMenu,
    addSynergyEvent,
    showNextSynergy,
    completeAnimation,
  ]);

  // シナジー演出中の処理
  useEffect(() => {
    if (animationPhase === 'showing_synergy' && currentSynergy) {
      // スタッフアイコンを光らせる
      setGlowingStaffIds(new Set([currentSynergy.staffId]));

      // 価格アニメーション開始
      const menuIndex = currentSynergy.menuIndex;
      if (menuIndex !== undefined) {
        const menu = registeredMenus[menuIndex];
        if (menu) {
          const bonusAmount = parseBonusValue(currentSynergy.bonusText, menu.price);
          // refから現在のボーナス値を取得（無限ループ防止）
          const currentBonus = menuBonusesRef.current[menuIndex] || 0;
          const targetBonus = currentBonus + bonusAmount;
          // refを先に更新して次のシナジーで正しい値が使われるようにする
          menuBonusesRef.current = { ...menuBonusesRef.current, [menuIndex]: targetBonus };

          // ドゥルルルアニメーション
          let step = 0;
          const stepInterval = PRICE_ANIMATION_DURATION / PRICE_ANIMATION_STEPS;
          const stepAmount = bonusAmount / PRICE_ANIMATION_STEPS;

          const animatePrice = () => {
            step++;
            const animatedValue = currentBonus + Math.floor(stepAmount * step);
            setMenuBonuses(prev => ({ ...prev, [menuIndex]: Math.min(animatedValue, targetBonus) }));

            if (step < PRICE_ANIMATION_STEPS) {
              priceAnimationRef.current = window.setTimeout(animatePrice, stepInterval);
            } else {
              // アニメーション完了、最終値をセット
              setMenuBonuses(prev => ({ ...prev, [menuIndex]: targetBonus }));
              priceAnimationRef.current = null;
            }
          };

          priceAnimationRef.current = window.setTimeout(animatePrice, stepInterval);
        }
      }

      // 演出時間後に次へ
      const timeout = window.setTimeout(() => {
        setGlowingStaffIds(new Set());
        completeSynergy();
      }, SYNERGY_DISPLAY_TIME);

      return () => {
        clearTimeout(timeout);
        if (priceAnimationRef.current) {
          clearTimeout(priceAnimationRef.current);
        }
      };
    }
  }, [animationPhase, currentSynergy, completeSynergy, registeredMenus]);

  // シナジー演出完了後、メニュー表示を続ける or 完了
  // ※ advanceAnimation内でタイマーが設定されている場合はスキップ
  useEffect(() => {
    if (animationPhase === 'showing_menu' && displayedMenuCount > 0) {
      // 既にタイマーが設定されている場合はスキップ（シナジー演出待ち等）
      if (animationTimeoutRef.current || synergyTimeoutRef.current) {
        return;
      }

      const menuCount = useMenuStore.getState().registeredMenus.length;
      if (displayedMenuCount < menuCount) {
        // まだメニューがある場合、次のメニューを表示
        animationTimeoutRef.current = window.setTimeout(() => {
          animationTimeoutRef.current = null;
          advanceAnimation();
        }, MENU_APPEAR_DELAY);
      } else {
        // 全メニュー表示完了
        animationTimeoutRef.current = window.setTimeout(() => {
          animationTimeoutRef.current = null;
          completeAnimation();
        }, MENU_APPEAR_DELAY);
      }

      return () => {
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }
      };
    }
  }, [animationPhase, displayedMenuCount, advanceAnimation, completeAnimation]);

  // アニメーション開始時
  useEffect(() => {
    if (animationPhase === 'showing_menu' && displayedMenuCount === 0) {
      animationTimeoutRef.current = window.setTimeout(() => {
        animationTimeoutRef.current = null;
        advanceAnimation();
      }, 500); // 最初の表示は少し待つ

      return () => {
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }
      };
    }
  }, [animationPhase, displayedMenuCount, advanceAnimation]);

  // 客単価演出
  useEffect(() => {
    if (animationPhase === 'showing_total') {
      // 客単価を計算（メニュー価格 + ボーナス の合計）
      const totalPrice = registeredMenus.reduce((sum, menu, index) => {
        const bonus = menuBonusesRef.current[index] || 0;
        return sum + menu.price + bonus;
      }, 0);

      // ドゥルルルアニメーション
      const steps = 20;
      const stepInterval = 40; // 40ms × 20 = 800ms
      let step = 0;

      const animateTotal = () => {
        step++;
        const progress = step / steps;
        // イージング（最後に減速）
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayedTotal(Math.floor(totalPrice * eased));

        if (step < steps) {
          totalAnimationRef.current = window.setTimeout(animateTotal, stepInterval);
        } else {
          // 最終値セット
          setDisplayedTotal(totalPrice);
          totalAnimationRef.current = null;

          // パーン！演出
          setTimeout(() => {
            setShowTotalBurst(true);
            // 演出後にcompleteに遷移
            setTimeout(() => {
              completeTotalAnimation();
            }, 500);
          }, 200);
        }
      };

      totalAnimationRef.current = window.setTimeout(animateTotal, stepInterval);

      return () => {
        if (totalAnimationRef.current) {
          clearTimeout(totalAnimationRef.current);
        }
      };
    }
  }, [animationPhase, registeredMenus, completeTotalAnimation]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (synergyTimeoutRef.current) {
        clearTimeout(synergyTimeoutRef.current);
      }
      if (priceAnimationRef.current) {
        clearTimeout(priceAnimationRef.current);
      }
      if (totalAnimationRef.current) {
        clearTimeout(totalAnimationRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    if (animationPhase === 'complete' || animationPhase === 'idle') {
      closeBoard();
      // 実際に開店する
      useRestaurantStore.getState().openStore();
    }
  };

  const handleSkip = () => {
    // アニメーションをスキップして全表示
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    setGlowingStaffIds(new Set());
    completeAnimation();
  };

  // フッター（スキップ/開店ボタン）
  const footer = (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      {animationPhase === 'complete' ? (
        <WindowButton size="large" onClick={handleClose}>
          開店する
        </WindowButton>
      ) : (
        <WindowButton size="medium" onClick={handleSkip}>
          スキップ
        </WindowButton>
      )}
    </div>
  );

  return (
    <WindowDialog
      title="本日のメニュー"
      width="520px"
      footer={footer}
      contentPadding="12px"
    >
      {/* スタッフ表示エリア */}
      <div style={staffAreaStyle}>
        {staffStore.hiredStaff.map((staff) => (
          <div
            key={staff.id}
            style={{
              ...staffCardStyle,
              ...(glowingStaffIds.has(staff.id) ? staffGlowStyle : {}),
            }}
          >
            <img src={staff.iconUrl} alt={staff.name} style={staffIconStyle} />
            <span style={staffNameStyle}>{staff.name}</span>
            <span style={staffAbilityStyle}>{staff.description}</span>
          </div>
        ))}
        {staffStore.hiredStaff.length === 0 && (
          <div style={{ color: '#404040', fontSize: 11, fontFamily: 'MS Sans Serif, Tahoma, sans-serif' }}>
            スタッフがいません
          </div>
        )}
      </div>

      {/* メニューグリッド (2x3) */}
      <div style={menuGridStyle}>
        {slots.slice(0, 6).map((menu, index) => (
          <div
            key={index}
            style={{
              ...menuSlotStyle,
              ...(menu ? filledSlotStyle : emptySlotStyle),
              ...(currentSynergy?.menuIndex === index ? menuGlowStyle : {}),
              animation: menu && index === displayedMenuCount - 1 ? 'menuAppear 0.3s ease-out' : undefined,
              position: 'relative',
            }}
          >
            {menu ? (
              <>
                <img src={menu.iconUrl} alt={menu.name} style={menuIconStyle} />
                <div style={menuInfoStyle}>
                  <div style={menuNameStyle}>{menu.name}</div>
                  <div style={{
                    ...menuPriceStyle,
                    ...(menuBonuses[index] ? { color: '#006400', fontWeight: 'bold' } : {}),
                  }}>
                    {menu.price + (menuBonuses[index] || 0)}円
                    {menuBonuses[index] ? (
                      <span style={{ fontSize: 10, marginLeft: 4, color: '#800000', fontFamily: 'MS Sans Serif, Tahoma, sans-serif' }}>
                        (+{menuBonuses[index]})
                      </span>
                    ) : null}
                  </div>
                  {menu.description && (
                    <div style={menuDescStyle}>{menu.description}</div>
                  )}
                </div>
                {/* シナジー演出：メニュー側にボーナス表示 */}
                {currentSynergy?.menuIndex === index && (
                  <div style={menuBonusPopupStyle}>{currentSynergy.bonusText}</div>
                )}
              </>
            ) : (
              <div style={emptySlotTextStyle}>?</div>
            )}
          </div>
        ))}
      </div>

      {/* 客単価表示 */}
      {(animationPhase === 'showing_total' || animationPhase === 'complete') && (
        <div style={totalPriceContainerStyle}>
          <span style={totalPriceLabelStyle}>客単価</span>
          <span style={{
            ...totalPriceValueStyle,
            ...(showTotalBurst ? totalPriceBurstStyle : {}),
          }}>
            {displayedTotal}円
          </span>
          {showTotalBurst && <span style={burstEffectStyle}>🎉</span>}
        </div>
      )}

      {/* CSSアニメーション（Windows 98風） */}
      <style>{`
        @keyframes menuAppear {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { background-color: #FFFFC0; }
          50% { background-color: #FFFF80; }
        }
        @keyframes totalBurst {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes burstEmoji {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.3) rotate(15deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes bonusPopup {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          50% { transform: translateY(-8px) scale(1.1); opacity: 1; }
          100% { transform: translateY(-15px) scale(1); opacity: 1; }
        }
      `}</style>
    </WindowDialog>
  );
}

// スタイル定義（Windows 98風）
const staffAreaStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 12,
  padding: 8,
  backgroundColor: '#C0C0C0',
  // 内側にへこんだ3Dボーダー
  borderTop: '2px solid #808080',
  borderLeft: '2px solid #808080',
  borderBottom: '2px solid #FFFFFF',
  borderRight: '2px solid #FFFFFF',
  minHeight: 90,
  alignItems: 'stretch',
  flexWrap: 'wrap',
};

const staffCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: 85,
  height: 80,
  padding: 6,
  backgroundColor: '#C0C0C0',
  // Windows 98風の3Dボーダー（浮き出し）
  borderTop: '2px solid #FFFFFF',
  borderLeft: '2px solid #FFFFFF',
  borderBottom: '2px solid #808080',
  borderRight: '2px solid #808080',
  transition: 'all 0.2s ease',
  position: 'relative',
};

const staffGlowStyle: React.CSSProperties = {
  animation: 'glow 0.5s ease-in-out infinite',
  backgroundColor: '#FFFFC0',
  borderTop: '2px solid #FFD700',
  borderLeft: '2px solid #FFD700',
  borderBottom: '2px solid #B8860B',
  borderRight: '2px solid #B8860B',
};

const staffIconStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  marginBottom: 2,
};

const staffNameStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 'bold',
  textAlign: 'center',
  color: '#000000',
  maxWidth: 75,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
};

const staffAbilityStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#404040',
  textAlign: 'center',
  marginTop: 2,
  maxWidth: 75,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
};

// メニュー側のボーナス表示スタイル（Windows 98風）
const menuBonusPopupStyle: React.CSSProperties = {
  position: 'absolute',
  top: -12,
  right: 8,
  backgroundColor: '#FFFF00',
  color: '#800000',
  padding: '4px 10px',
  fontSize: 16,
  fontWeight: 'bold',
  animation: 'bonusPopup 0.5s ease-out forwards',
  whiteSpace: 'nowrap',
  // Windows 98風3Dボーダー
  borderTop: '2px solid #FFFFFF',
  borderLeft: '2px solid #FFFFFF',
  borderBottom: '2px solid #808080',
  borderRight: '2px solid #808080',
  fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
};

const menuGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 8,
  marginBottom: 12,
};

const menuSlotStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: 10,
  minHeight: 75,
  transition: 'all 0.3s ease',
  backgroundColor: '#C0C0C0',
};

const filledSlotStyle: React.CSSProperties = {
  backgroundColor: '#E0E0E0',
  // Windows 98風の3Dボーダー（浮き出し）
  borderTop: '2px solid #FFFFFF',
  borderLeft: '2px solid #FFFFFF',
  borderBottom: '2px solid #808080',
  borderRight: '2px solid #808080',
};

const emptySlotStyle: React.CSSProperties = {
  backgroundColor: '#C0C0C0',
  // へこんだ3Dボーダー
  borderTop: '2px solid #808080',
  borderLeft: '2px solid #808080',
  borderBottom: '2px solid #FFFFFF',
  borderRight: '2px solid #FFFFFF',
  justifyContent: 'center',
};

const menuGlowStyle: React.CSSProperties = {
  animation: 'glow 0.5s ease-in-out infinite',
  backgroundColor: '#FFFFC0',
  borderTop: '2px solid #FFD700',
  borderLeft: '2px solid #FFD700',
  borderBottom: '2px solid #B8860B',
  borderRight: '2px solid #B8860B',
};

const menuIconStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  marginRight: 10,
  flexShrink: 0,
};

const menuInfoStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden',
};

const menuNameStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 'bold',
  marginBottom: 2,
  color: '#000000',
  fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
};

const menuPriceStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#008000',
  marginBottom: 2,
  fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
};

const menuDescStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#404040',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
};

const emptySlotTextStyle: React.CSSProperties = {
  fontSize: 28,
  color: '#808080',
  fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
};

// 客単価表示用スタイル（Windows 98風）
const totalPriceContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: '12px 0',
  marginBottom: 8,
  backgroundColor: '#E0E0E0',
  // Windows 98風の3Dボーダー（浮き出し）
  borderTop: '2px solid #FFFFFF',
  borderLeft: '2px solid #FFFFFF',
  borderBottom: '2px solid #808080',
  borderRight: '2px solid #808080',
};

const totalPriceLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#000000',
  fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
};

const totalPriceValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 'bold',
  color: '#008000',
  transition: 'all 0.1s ease',
  fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
};

const totalPriceBurstStyle: React.CSSProperties = {
  animation: 'totalBurst 0.5s ease-out',
  color: '#800000',
};

const burstEffectStyle: React.CSSProperties = {
  fontSize: 28,
  animation: 'burstEmoji 0.5s ease-out',
};
