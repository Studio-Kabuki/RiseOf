import { useState, useEffect, useRef, useCallback } from 'react';
import { useMenuStore } from '../store/menuStore';
import { useStaffStore } from '../store/staffStore';
import { useRestaurantStore } from '../store/restaurantStore';
import { CATEGORY_INFO, type MenuCategory } from '../types/menu';
import { WindowDialog } from './ui/WindowDialog';
import { WindowButton } from './ui/WindowButton';
import type { StaffDefinition } from '../types/staffDefinition';

// ファンファーレ演出の状態
type FanfarePhase = 'idle' | 'animating' | 'waiting' | 'complete';

interface FanfareState {
  phase: FanfarePhase;
  currentMenuIndex: number;
  currentStaffIndex: number;
  menuBonuses: Record<number, number>;
  displayedTotal: number;
  glowingStaffId: string | null;
  glowingMenuIndex: number | null;
}

const FANFARE_GLOW_DURATION = 500;
const FANFARE_STEP_DELAY = 200;
const CARD_SIZE = 65; // カードサイズ（1.25倍）
const CARD_GAP = 4; // 余裕がある時のカード間隔
const MAX_CARD_OVERLAP = 30; // 最大重なり幅
const CARD_EFFECTIVE_WIDTH = CARD_SIZE - 15; // ドラッグ時の実効幅（旧CARD_OVERLAP相当）

// カード表示に必要な幅を計算（動的マージン対応）
const calculateCardMargin = (containerWidth: number, cardCount: number, includeEmptySlot: boolean): number => {
  if (cardCount <= 0) return 0;
  const totalCards = includeEmptySlot ? cardCount + 1 : cardCount;
  if (totalCards <= 1) return 0;

  // 理想的な幅（ギャップ付き）
  const idealWidth = totalCards * CARD_SIZE + (totalCards - 1) * CARD_GAP;

  if (idealWidth <= containerWidth) {
    // 余裕がある: ギャップ（正の間隔）
    return CARD_GAP;
  } else {
    // 余裕がない: 重なり（負のマージン）を計算
    const neededOverlap = (totalCards * CARD_SIZE - containerWidth) / (totalCards - 1);
    return -Math.min(neededOverlap, MAX_CARD_OVERLAP);
  }
};

// Windows 98 スタイルの3Dパネル
const Panel3D = ({ children, inset = false, style = {}, onClick }: { children: React.ReactNode; inset?: boolean; style?: React.CSSProperties; onClick?: () => void }) => (
  <div
    onClick={onClick}
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

// Windows 98風ツールチップ
interface TooltipProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function Win98Tooltip({ children, style }: TooltipProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 8,
        backgroundColor: '#FFFFCC',
        border: '1px solid #000000',
        padding: '6px 8px',
        fontSize: 11,
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        zIndex: 1000,
        boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        color: '#000000',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// カード型表示コンポーネント
interface CardProps {
  iconUrl: string;
  name: string;
  subText?: string;
  category?: MenuCategory; // メニューカテゴリ（バッジ表示用）
  seasoningIconUrl?: string; // シーズニングアイコン（適用済みの場合表示）
  isGlowing?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
  isSeasoningDropTarget?: boolean; // シーズニングドロップのターゲット（光らせる）
  zIndex?: number;
  offsetX?: number; // ドラッグ中のスライドオフセット（横）
  offsetY?: number; // ドラッグ中のスライドオフセット（縦）
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  tooltipContent?: React.ReactNode;
}

function Card({
  iconUrl,
  name,
  subText,
  category,
  seasoningIconUrl,
  isGlowing,
  isHovered,
  isDragging,
  isSelected,
  isSeasoningDropTarget,
  zIndex = 1,
  offsetX = 0,
  offsetY = 0,
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  tooltipContent,
}: CardProps) {
  // スライドアニメーション用のtransform
  const slideTransform = (offsetX !== 0 || offsetY !== 0) ? `translate(${offsetX}px, ${offsetY}px)` : '';
  const dragTransform = isDragging ? 'scale(1.1)' : '';
  const hoverTransform = isHovered && !isDragging ? 'translateY(-4px) scale(1.05)' : '';
  const seasoningTargetTransform = isSeasoningDropTarget ? 'scale(1.08)' : '';
  const combinedTransform = [slideTransform, dragTransform, hoverTransform, seasoningTargetTransform].filter(Boolean).join(' ') || 'none';

  const categoryInfo = category ? CATEGORY_INFO[category] : null;

  // シーズニングドロップターゲットのスタイル
  const isSeasoningGlow = isSeasoningDropTarget || isGlowing;
  const seasoningDropStyle = isSeasoningDropTarget ? {
    boxShadow: '0 0 12px #FFD700, 0 0 24px rgba(255,215,0,0.5)',
  } : {};

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE + 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isSeasoningGlow ? '#FFFFC0' : '#FFFFFF',
        borderTop: isSeasoningGlow ? '2px solid #FFD700' : '2px solid #FFFFFF',
        borderLeft: isSeasoningGlow ? '2px solid #FFD700' : '2px solid #FFFFFF',
        borderBottom: isSeasoningGlow ? '2px solid #B8860B' : '2px solid #808080',
        borderRight: isSeasoningGlow ? '2px solid #B8860B' : '2px solid #808080',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
        transform: combinedTransform,
        boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.4)' : isHovered ? '0 4px 8px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(0,0,0,0.2)',
        zIndex: isDragging ? 200 : isHovered ? 100 : zIndex,
        animation: isSeasoningGlow && !isSeasoningDropTarget ? 'cardGlow 0.5s ease-in-out' : undefined,
        position: 'relative',
        userSelect: 'none',
        touchAction: 'none',
        ...seasoningDropStyle,
        ...style,
      }}
    >
      {/* ホバー時またはタップ選択時のツールチップ（ドラッグ中は非表示） */}
      {(isHovered || isSelected) && !isDragging && tooltipContent && (
        <Win98Tooltip>{tooltipContent}</Win98Tooltip>
      )}
      {/* シーズニングアイコン（適用済みの場合、右上に表示） */}
      {seasoningIconUrl && (
        <div
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 20,
            height: 20,
            backgroundColor: '#FFF8E8',
            border: '1px solid #DAA520',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
          }}
        >
          <img
            src={seasoningIconUrl}
            alt="seasoning"
            style={{ width: 16, height: 16 }}
            draggable={false}
          />
        </div>
      )}
      <img
        src={iconUrl}
        alt={name}
        style={{ width: 40, height: 40, marginBottom: 2, pointerEvents: 'none' }}
        draggable={false}
      />
      <div
        style={{
          fontSize: 10,
          color: '#000000',
          textAlign: 'center',
          maxWidth: CARD_SIZE - 6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
          pointerEvents: 'none',
        }}
      >
        {name}
      </div>
      {subText && (
        <div
          style={{
            fontSize: 11,
            color: '#FFFFFF',
            fontWeight: 900,
            textAlign: 'center',
            fontFamily: 'inherit',
            pointerEvents: 'none',
            backgroundColor: categoryInfo?.color || '#DAA520',
            padding: '2px 6px',
            border: `1px solid ${categoryInfo?.color ? 'rgba(0,0,0,0.3)' : '#B8860B'}`,
            textShadow: '0 1px 1px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <span style={{ fontSize: 13 }}>{categoryInfo?.icon || '🪙'}</span>
          <span>{subText}G</span>
        </div>
      )}
    </div>
  );
}

// 空のカードスロット
function EmptyCard({ onClick }: { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE + 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8E8E8',
        borderTop: '1px solid #808080',
        borderLeft: '1px solid #808080',
        borderBottom: '1px solid #FFFFFF',
        borderRight: '1px solid #FFFFFF',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 24, color: '#808080' }}>+</span>
    </div>
  );
}

// 折りたたみボタン
function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 16,
        height: 16,
        padding: 0,
        backgroundColor: '#C0C0C0',
        borderTop: '1px solid #FFFFFF',
        borderLeft: '1px solid #FFFFFF',
        borderBottom: '1px solid #808080',
        borderRight: '1px solid #808080',
        cursor: 'pointer',
        fontSize: 10,
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {collapsed ? '+' : '−'}
    </button>
  );
}

export function StatusPanel() {
  const {
    registeredMenus,
    maxMenuSlots,
    reorderMenus,
    removeMenu,
    getMenuSeasoning,
    getSeasoningDefinition,
    appliedSeasonings, // スタックカウント変更でリアルタイム更新するため購読
    draggingSeasoningId,
    draggingSeasoningCost,
    draggingSeasoningPosition,
    dropTargetMenuId,
    setDropTargetMenuId,
    applySeasoning,
  } = useMenuStore();
  const { hiredStaff, baseBonuses, categoryBonuses, maxStaffSlots, reorderStaff, fireStaff } = useStaffStore();
  const { isOpen, lit, spendLit } = useRestaurantStore();

  // 解雇確認ダイアログの状態
  const [fireConfirmStaff, setFireConfirmStaff] = useState<StaffDefinition | null>(null);

  // メニューカードの要素を追跡（シーズニングドロップ判定用）
  const menuCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // カードコンテナの幅を追跡（動的マージン計算用）
  const staffContainerRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const [staffContainerWidth, setStaffContainerWidth] = useState(0);
  const [menuContainerWidth, setMenuContainerWidth] = useState(0);

  // コンテナ幅の計測
  useEffect(() => {
    const measureWidths = () => {
      if (staffContainerRef.current) {
        setStaffContainerWidth(staffContainerRef.current.offsetWidth);
      }
      if (menuContainerRef.current) {
        setMenuContainerWidth(menuContainerRef.current.offsetWidth);
      }
    };

    measureWidths();

    // リサイズ時にも計測
    window.addEventListener('resize', measureWidths);
    return () => window.removeEventListener('resize', measureWidths);
  }, []);

  // カード数が変わった時も再計測
  useEffect(() => {
    if (staffContainerRef.current) {
      setStaffContainerWidth(staffContainerRef.current.offsetWidth);
    }
    if (menuContainerRef.current) {
      setMenuContainerWidth(menuContainerRef.current.offsetWidth);
    }
  }, [hiredStaff.length, registeredMenus.length, maxStaffSlots, maxMenuSlots]);

  // 折りたたみ状態
  const [staffMenuCollapsed, setStaffMenuCollapsed] = useState(false);

  const [fanfare, setFanfare] = useState<FanfareState>({
    phase: 'idle',
    currentMenuIndex: 0,
    currentStaffIndex: 0,
    menuBonuses: {},
    displayedTotal: 0,
    glowingStaffId: null,
    glowingMenuIndex: null,
  });

  // ツールチップは同時に1つだけ表示
  const [activeTooltip, setActiveTooltip] = useState<{ type: 'staff' | 'menu'; id: string; index: number } | null>(null);
  // タップ用の選択状態（スマホ対応）
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState<number | null>(null);

  // ドラッグ状態管理
  const [dragState, setDragState] = useState<{
    type: 'staff' | 'menu' | null;
    fromIndex: number;
    currentIndex: number; // ドラッグ中の現在位置（並び替え後）
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isOverTrash: boolean; // ゴミ箱の上にいるか
  } | null>(null);
  // 最新のdragStateをrefで追跡（クロージャ問題対策）
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  // 最新のhiredStaffとregisteredMenusをrefで追跡（クロージャ問題対策）
  const hiredStaffRef = useRef(hiredStaff);
  hiredStaffRef.current = hiredStaff;
  const registeredMenusRef = useRef(registeredMenus);
  registeredMenusRef.current = registeredMenus;
  // ドラッグ後のクリックを無視するためのフラグ
  const justDraggedRef = useRef(false);
  // ゴミ箱領域のref
  const trashRef = useRef<HTMLDivElement>(null);
  // 最新のisOverTrash状態を追跡（mouseup時にstateが未更新の問題を解決）
  const isOverTrashRef = useRef(false);

  const timeoutRef = useRef<number | null>(null);
  const prevIsOpen = useRef(isOpen);

  // 前回のドラッグ状態を追跡（ドロップ判定用）
  const prevDraggingSeasoningIdRef = useRef<string | null>(null);

  // シーズニングドラッグ中のオーバーラップ検出
  useEffect(() => {
    if (!draggingSeasoningPosition || !draggingSeasoningId) {
      // ドラッグ終了時にドロップ処理
      if (prevDraggingSeasoningIdRef.current && dropTargetMenuId) {
        // ドロップターゲットがあれば適用（既存シーズニングは上書き）
        if (lit >= draggingSeasoningCost) {
          spendLit(draggingSeasoningCost);
          applySeasoning(dropTargetMenuId, prevDraggingSeasoningIdRef.current);
        }
        setDropTargetMenuId(null);
      }
      prevDraggingSeasoningIdRef.current = null;
      return;
    }

    prevDraggingSeasoningIdRef.current = draggingSeasoningId;

    // マウス位置と各メニューカードの重なりをチェック（シーズニング適用済みでもドロップ可能）
    let foundTarget: string | null = null;
    menuCardRefs.current.forEach((element, menuId) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (
        draggingSeasoningPosition.x >= rect.left &&
        draggingSeasoningPosition.x <= rect.right &&
        draggingSeasoningPosition.y >= rect.top &&
        draggingSeasoningPosition.y <= rect.bottom
      ) {
        foundTarget = menuId;
      }
    });

    setDropTargetMenuId(foundTarget);
  }, [
    draggingSeasoningId,
    draggingSeasoningPosition,
    draggingSeasoningCost,
    dropTargetMenuId,
    lit,
    applySeasoning,
    spendLit,
    setDropTargetMenuId,
  ]);

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

  // ファンファーレ進行
  useEffect(() => {
    if (fanfare.phase !== 'animating') return;

    const { currentMenuIndex, currentStaffIndex, menuBonuses } = fanfare;
    const menu = registeredMenus[currentMenuIndex];

    if (!menu) {
      setFanfare(prev => ({ ...prev, phase: 'complete' }));
      return;
    }

    const menuCategory = menu.category;

    for (let i = currentStaffIndex; i < hiredStaff.length; i++) {
      const staff = hiredStaff[i];
      const staffCategory = staff.params?.category as string | undefined;

      if (!menuCategory || !staffCategory || menuCategory !== staffCategory) continue;

      let bonusAmount = 0;
      if (staff.ability === 'base_bonus') {
        bonusAmount = (staff.params.value as number) || 0;
      } else if (staff.ability === 'category_bonus') {
        const multiplier = (staff.params.multiplier as number) || 1;
        const currentPrice = menu.price + (menuBonuses[currentMenuIndex] || 0);
        bonusAmount = Math.floor(currentPrice * (multiplier - 1));
      }

      if (bonusAmount > 0) {
        setFanfare(prev => ({
          ...prev,
          phase: 'waiting',
          glowingStaffId: staff.id,
          glowingMenuIndex: currentMenuIndex,
        }));

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

        return;
      }
    }

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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fanfare.phase, fanfare.currentMenuIndex, fanfare.currentStaffIndex, registeredMenus, hiredStaff]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getMenuDisplayPrice = useCallback((index: number) => {
    const menu = registeredMenus[index];
    if (!menu) return 0;
    if (fanfare.phase === 'animating' || fanfare.phase === 'waiting') {
      return menu.price + (fanfare.menuBonuses[index] || 0);
    }
    const category = menu.category;
    let price = menu.price;
    if (category) {
      price += baseBonuses[category] || 0;
      price = Math.floor(price * (categoryBonuses[category] || 1));
    }

    // シーズニング効果を適用
    const appliedSeasoning = getMenuSeasoning(menu.id);
    if (appliedSeasoning) {
      const seasoningDef = getSeasoningDefinition(appliedSeasoning.seasoningId);
      if (seasoningDef) {
        switch (seasoningDef.effectType) {
          case 'sales_multiplier': {
            const multiplier = seasoningDef.params.multiplier || 1;
            price = Math.floor(price * multiplier);
            break;
          }
          case 'stacking_bonus': {
            const stackValue = seasoningDef.params.stackValue || 0;
            price += stackValue * appliedSeasoning.stackCount;
            break;
          }
          case 'category_bonus': {
            const multiplier = seasoningDef.params.multiplier || 1;
            const categoryBonus = seasoningDef.params.categoryBonus as { category: string; extraMultiplier: number } | undefined;
            if (categoryBonus && menu.category === categoryBonus.category) {
              price = Math.floor(price * multiplier * categoryBonus.extraMultiplier);
            } else {
              price = Math.floor(price * multiplier);
            }
            break;
          }
          // all_categories は価格に影響しない
        }
      }
    }

    return price;
  }, [fanfare.phase, fanfare.menuBonuses, registeredMenus, baseBonuses, categoryBonuses, getMenuSeasoning, getSeasoningDefinition, appliedSeasonings]);

  const calculateTotal = useCallback(() => {
    if (fanfare.phase === 'animating' || fanfare.phase === 'waiting') {
      return fanfare.displayedTotal;
    }
    return registeredMenus.reduce((sum, _, index) => {
      return sum + getMenuDisplayPrice(index);
    }, 0);
  }, [fanfare.phase, fanfare.displayedTotal, registeredMenus, getMenuDisplayPrice]);

  // マウスイベントベースのドラッグ＆ドロップ
  const handleMouseDown = useCallback((type: 'staff' | 'menu', index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragState({
      type,
      fromIndex: index,
      currentIndex: index,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isOverTrash: false,
    });
  }, []);

  // ドラッグ中のマウス移動とマウスアップを処理
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;
      const items = dragState.type === 'staff' ? hiredStaffRef.current : registeredMenusRef.current;

      // 移動量からターゲットインデックスを計算
      const moveSteps = Math.round(deltaX / CARD_EFFECTIVE_WIDTH);
      let newIndex = dragState.fromIndex + moveSteps;
      newIndex = Math.max(0, Math.min(items.length - 1, newIndex));

      // ゴミ箱領域の上にいるかチェック
      let isOverTrash = false;
      if (trashRef.current) {
        const trashRect = trashRef.current.getBoundingClientRect();
        isOverTrash = (
          e.clientX >= trashRect.left &&
          e.clientX <= trashRect.right &&
          e.clientY >= trashRect.top &&
          e.clientY <= trashRect.bottom
        );
      }
      // refを同期的に更新（mouseup時に最新値を取得するため）
      isOverTrashRef.current = isOverTrash;

      setDragState(prev => prev ? {
        ...prev,
        currentIndex: newIndex,
        currentX: e.clientX,
        currentY: e.clientY,
        isOverTrash,
      } : null);
    };

    const handleMouseUp = (_e: MouseEvent) => {
      // 最新のdragStateをrefから取得（クロージャ問題対策）
      const currentDragState = dragStateRef.current;
      if (!currentDragState) return;

      // ドラッグが発生した場合（少しでも移動した場合）、直後のクリックを無視
      const wasDragged = Math.abs(currentDragState.currentX - currentDragState.startX) > 5 ||
                        Math.abs(currentDragState.currentY - currentDragState.startY) > 5;
      if (wasDragged) {
        justDraggedRef.current = true;
        // 次のイベントループでリセット
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 0);
      }

      // refから最新のisOverTrash状態を取得（タッチデバイスやstate更新タイミングの問題を解決）
      const isOverTrash = isOverTrashRef.current;

      // ゴミ箱にドロップした場合は削除（スタッフは確認ダイアログ付き）
      if (isOverTrash) {
        if (currentDragState.type === 'staff') {
          const staff = hiredStaffRef.current[currentDragState.fromIndex];
          if (staff) {
            // 解雇確認ダイアログを表示（ドラッグ状態は維持）
            setFireConfirmStaff(staff);
            return; // setDragState(null)を呼ばずに終了
          }
        } else if (currentDragState.type === 'menu') {
          const menu = registeredMenusRef.current[currentDragState.fromIndex];
          if (menu) {
            removeMenu(menu.id);
          }
        }
      } else if (currentDragState.fromIndex !== currentDragState.currentIndex) {
        // 通常の並び替え
        if (currentDragState.type === 'staff' && reorderStaff) {
          reorderStaff(currentDragState.fromIndex, currentDragState.currentIndex);
        } else if (currentDragState.type === 'menu' && reorderMenus) {
          reorderMenus(currentDragState.fromIndex, currentDragState.currentIndex);
        }
      }
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, reorderStaff, reorderMenus, fireStaff, removeMenu]);

  // アイテムの表示順序を計算（ドラッグ中の並び替えプレビュー）
  const getDisplayOrder = useCallback((type: 'staff' | 'menu', originalIndex: number): { displayIndex: number; offsetX: number; offsetY: number } => {
    if (!dragState || dragState.type !== type) {
      return { displayIndex: originalIndex, offsetX: 0, offsetY: 0 };
    }

    const { fromIndex, currentIndex, startX, currentX, startY, currentY } = dragState;

    if (originalIndex === fromIndex) {
      // ドラッグ中のアイテム：マウスに追従（X軸・Y軸両方）
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      return { displayIndex: originalIndex, offsetX: deltaX, offsetY: deltaY };
    }

    // 他のアイテム：スライドして場所を空ける（ゴミ箱の上にいる時はスライドしない）
    if (dragState.isOverTrash) {
      return { displayIndex: originalIndex, offsetX: 0, offsetY: 0 };
    }

    if (fromIndex < currentIndex) {
      // 右に移動中
      if (originalIndex > fromIndex && originalIndex <= currentIndex) {
        return { displayIndex: originalIndex, offsetX: -CARD_EFFECTIVE_WIDTH, offsetY: 0 };
      }
    } else if (fromIndex > currentIndex) {
      // 左に移動中
      if (originalIndex >= currentIndex && originalIndex < fromIndex) {
        return { displayIndex: originalIndex, offsetX: CARD_EFFECTIVE_WIDTH, offsetY: 0 };
      }
    }

    return { displayIndex: originalIndex, offsetX: 0, offsetY: 0 };
  }, [dragState]);

  // パネルクリックで選択解除
  const handlePanelClick = () => {
    setSelectedStaffId(null);
    setSelectedMenuIndex(null);
  };

  return (
    <div
      onClick={handlePanelClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        margin: '2px 2px 0 2px',
        flexShrink: 0,
      }}
    >
      {/* 編成パネル */}
      <Panel3D
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 12,
          padding: '6px 12px',
        }}
      >
        {/* 左側: スタッフ・メニュー */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {/* ヘッダー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CollapseButton collapsed={staffMenuCollapsed} onClick={() => setStaffMenuCollapsed(!staffMenuCollapsed)} />
            <span style={{ fontSize: 10, color: '#000000', fontWeight: 'bold', width: 28 }}>
              編成
            </span>
          </div>

          {!staffMenuCollapsed && (
            <>
              {/* スタッフカード行 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 9, color: '#000000', fontWeight: 'bold', width: 22, flexShrink: 0 }}>
                  スタッフ
                </span>
                <div
                  ref={staffContainerRef}
                  style={{
                    display: 'flex',
                    width: Math.max(maxStaffSlots, maxMenuSlots) * CARD_SIZE + (Math.max(maxStaffSlots, maxMenuSlots) - 1) * CARD_GAP,
                  }}
                >
                  {(() => {
                    // 雇用可能なスロット数（デフォルトスタッフは含まない）
                    // 店長がhiredStaffに含まれるので、全スロット数をそのまま使用
                    const hireableSlots = maxStaffSlots;
                    const staffMargin = calculateCardMargin(staffContainerWidth, hireableSlots, false);
                    return Array.from({ length: hireableSlots }).map((_, index) => {
                      const staff = hiredStaff[index];
                      const isGlowing = staff && fanfare.glowingStaffId === staff.id;
                      const isDragging = staff && dragState?.type === 'staff' && dragState.fromIndex === index;
                      const isHovered = staff && activeTooltip?.type === 'staff' && activeTooltip.id === staff.id && !isDragging;
                      const { offsetX, offsetY } = staff ? getDisplayOrder('staff', index) : { offsetX: 0, offsetY: 0 };
                      return (
                        <div
                          key={staff?.id ?? `empty-staff-${index}`}
                          style={{
                            marginLeft: index === 0 ? 0 : staffMargin,
                            zIndex: isDragging ? 200 : isHovered ? 100 : hireableSlots - index,
                            transition: isDragging ? 'none' : 'transform 0.15s ease, margin-left 0.15s ease',
                          }}
                        >
                          {staff ? (
                            <Card
                              iconUrl={staff.iconUrl}
                              name={staff.name}
                              isGlowing={isGlowing}
                              isHovered={isHovered}
                              isDragging={isDragging}
                              isSelected={selectedStaffId === staff.id}
                              offsetX={offsetX}
                              offsetY={offsetY}
                              onMouseDown={handleMouseDown('staff', index)}
                              onMouseEnter={() => !dragState && setActiveTooltip({ type: 'staff', id: staff.id, index })}
                              onMouseLeave={() => setActiveTooltip(null)}
                              onClick={() => {
                                if (!dragState && !justDraggedRef.current) {
                                  setSelectedStaffId(prev => prev === staff.id ? null : staff.id);
                                  setSelectedMenuIndex(null);
                                }
                              }}
                              tooltipContent={
                                <div>
                                  <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{staff.name}</div>
                                  <div style={{ color: '#006600' }}>{staff.description}</div>
                                </div>
                              }
                            />
                          ) : (
                            <EmptyCard />
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* メニューカード行 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 9, color: '#000000', fontWeight: 'bold', width: 22, flexShrink: 0 }}>
                  メニュー
                </span>
                <div
                  ref={menuContainerRef}
                  style={{
                    display: 'flex',
                    width: Math.max(maxStaffSlots, maxMenuSlots) * CARD_SIZE + (Math.max(maxStaffSlots, maxMenuSlots) - 1) * CARD_GAP,
                  }}
                >
                  {(() => {
                    const menuMargin = calculateCardMargin(menuContainerWidth, maxMenuSlots, false);
                    return Array.from({ length: maxMenuSlots }).map((_, index) => {
                    const menu = registeredMenus[index];
                    const isGlowing = fanfare.glowingMenuIndex === index;
                    const isDragging = dragState?.type === 'menu' && dragState.fromIndex === index;
                    const isHovered = activeTooltip?.type === 'menu' && activeTooltip.index === index && !isDragging;
                    const displayPrice = getMenuDisplayPrice(index);
                    const { offsetX, offsetY } = menu ? getDisplayOrder('menu', index) : { offsetX: 0, offsetY: 0 };
                    // シーズニングドロップターゲットかどうか
                    const isSeasoningDropTarget = menu && dropTargetMenuId === menu.id;
                    // シーズニングアイコン取得
                    const appliedSeasoning = menu ? getMenuSeasoning(menu.id) : null;
                    const seasoningDef = appliedSeasoning ? getSeasoningDefinition(appliedSeasoning.seasoningId) : null;

                    return (
                      <div
                        key={menu?.id ?? `empty-${index}`}
                        ref={(el) => {
                          // メニューカードの要素を追跡（シーズニングドロップ判定用）
                          if (menu && el) {
                            menuCardRefs.current.set(menu.id, el);
                          } else if (menu) {
                            menuCardRefs.current.delete(menu.id);
                          }
                        }}
                        style={{
                          marginLeft: index === 0 ? 0 : menuMargin,
                          zIndex: isDragging ? 200 : isSeasoningDropTarget ? 150 : isHovered ? 100 : maxMenuSlots - index,
                          transition: isDragging ? 'none' : 'transform 0.15s ease, margin-left 0.15s ease',
                        }}
                      >
                        {menu ? (
                          <Card
                            iconUrl={menu.iconUrl}
                            name={menu.name}
                            subText={`${displayPrice}`}
                            category={menu.category}
                            seasoningIconUrl={seasoningDef?.iconUrl}
                            isGlowing={isGlowing}
                            isHovered={isHovered}
                            isDragging={isDragging}
                            isSelected={selectedMenuIndex === index}
                            isSeasoningDropTarget={isSeasoningDropTarget}
                            offsetX={offsetX}
                            offsetY={offsetY}
                            onMouseDown={handleMouseDown('menu', index)}
                            onMouseEnter={() => !dragState && setActiveTooltip({ type: 'menu', id: menu.id, index })}
                            onMouseLeave={() => setActiveTooltip(null)}
                            onClick={() => {
                              if (!dragState && !justDraggedRef.current) {
                                setSelectedMenuIndex(prev => prev === index ? null : index);
                                setSelectedStaffId(null);
                              }
                            }}
                            tooltipContent={(() => {
                              const appliedSeasoning = getMenuSeasoning(menu.id);
                              const seasoningDef = appliedSeasoning ? getSeasoningDefinition(appliedSeasoning.seasoningId) : null;
                              return (
                                <div>
                                  <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{menu.name}</div>
                                  <div>基本価格: {menu.price}G</div>
                                  {displayPrice !== menu.price && (
                                    <div style={{ color: '#006600', fontWeight: 'bold' }}>
                                      ボーナス後: {displayPrice}G
                                    </div>
                                  )}
                                  {seasoningDef && (
                                    <div style={{ marginTop: 4, padding: '3px 6px', backgroundColor: '#FFF8E8', border: '1px solid #DAA520' }}>
                                      <div style={{ color: '#8B4513', fontWeight: 'bold', fontSize: 10 }}>
                                        🧂 {seasoningDef.name}
                                      </div>
                                      <div style={{ fontSize: 9, color: '#666666' }}>
                                        {seasoningDef.description}
                                      </div>
                                      {appliedSeasoning && appliedSeasoning.stackCount > 0 && (
                                        <div style={{ fontSize: 9, color: '#CC6600' }}>
                                          スタック: {appliedSeasoning.stackCount}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {menu.description && (
                                    <div style={{ marginTop: 4, color: '#666666' }}>
                                      {menu.description.split('\\n').map((line, i) => (
                                        <div key={i}>{line}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          />
                        ) : (
                          <EmptyCard />
                        )}
                      </div>
                    );
                  });
                  })()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 右側: ゴミ箱と客単価（編成パネル内、折りたたみ時は非表示） */}
        {!staffMenuCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, marginLeft: 'auto' }}>
            {/* ゴミ箱 */}
            <div
              ref={trashRef}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: CARD_SIZE + 20,
                height: CARD_SIZE + 20,
                backgroundColor: dragState?.isOverTrash ? '#FFCCCC' : '#E8E8E8',
                borderTop: dragState?.isOverTrash ? '2px solid #FF0000' : '1px solid #808080',
                borderLeft: dragState?.isOverTrash ? '2px solid #FF0000' : '1px solid #808080',
                borderBottom: dragState?.isOverTrash ? '2px solid #990000' : '1px solid #FFFFFF',
                borderRight: dragState?.isOverTrash ? '2px solid #990000' : '1px solid #FFFFFF',
                transition: 'background-color 0.15s ease, border-color 0.15s ease',
              }}
            >
              <span style={{ fontSize: 24 }}>🗑️</span>
              <span style={{
                fontSize: 10,
                color: dragState?.isOverTrash ? '#CC0000' : '#808080',
                fontWeight: dragState?.isOverTrash ? 'bold' : 'normal',
              }}>
                {dragState?.type === 'staff' ? '解雇' : '削除'}
              </span>
            </div>

            {/* 客単価 */}
            <Panel3D
              inset
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 8px',
                backgroundColor: '#FFFFF0',
                flex: 1,
              }}
            >
              <span style={{ fontSize: 9, color: '#404040', marginBottom: 2 }}>客単価</span>
              <span style={{ fontSize: 16, fontWeight: 'bold', color: '#008000' }}>
                {calculateTotal()}円
              </span>
            </Panel3D>
          </div>
        )}
      </Panel3D>

      {/* CSSアニメーション */}
      <style>{`
        @keyframes cardGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); box-shadow: 0 0 10px rgba(255, 215, 0, 0.8); }
        }
      `}</style>

      {/* 解雇確認ダイアログ */}
      {fireConfirmStaff && (
        <WindowDialog
          title={fireConfirmStaff.shopExclude ? "エラー" : "確認"}
          width="300px"
          zIndex={2000}
          variant={fireConfirmStaff.shopExclude ? "error" : "default"}
          onClose={() => {
            setFireConfirmStaff(null);
            setDragState(null);
          }}
          footer={
            fireConfirmStaff.shopExclude ? (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <WindowButton onClick={() => {
                  setFireConfirmStaff(null);
                  setDragState(null);
                }}>
                  OK
                </WindowButton>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
                <WindowButton onClick={() => {
                  setFireConfirmStaff(null);
                  setDragState(null);
                }}>
                  いいえ
                </WindowButton>
                <WindowButton
                  onClick={() => {
                    fireStaff(fireConfirmStaff.id);
                    setFireConfirmStaff(null);
                    setDragState(null);
                  }}
                >
                  はい
                </WindowButton>
              </div>
            )
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={fireConfirmStaff.iconUrl}
              alt={fireConfirmStaff.name}
              style={{ width: 48, height: 48, objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{fireConfirmStaff.name}</div>
              {fireConfirmStaff.shopExclude ? (
                <div>は解雇できません</div>
              ) : (
                <div>を本当に解雇しますか？</div>
              )}
            </div>
          </div>
        </WindowDialog>
      )}
    </div>
  );
}
