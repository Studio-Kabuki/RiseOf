import { useState, useEffect, useRef, useCallback } from 'react';
import { useMenuStore } from '../store/menuStore';
import { useStaffStore } from '../store/staffStore';
import { useRestaurantStore } from '../store/restaurantStore';
import { CATEGORY_INFO, type MenuCategory } from '../types/menu';

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
const CARD_OVERLAP = 15; // 重なり幅（1.25倍）
const CARD_EFFECTIVE_WIDTH = CARD_SIZE - CARD_OVERLAP; // ドラッグ時の実効幅

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
  isGlowing?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
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
  isGlowing,
  isHovered,
  isDragging,
  isSelected,
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
  const combinedTransform = [slideTransform, dragTransform, hoverTransform].filter(Boolean).join(' ') || 'none';

  const categoryInfo = category ? CATEGORY_INFO[category] : null;

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
        backgroundColor: isGlowing ? '#FFFFC0' : '#FFFFFF',
        borderTop: isGlowing ? '2px solid #FFD700' : '2px solid #FFFFFF',
        borderLeft: isGlowing ? '2px solid #FFD700' : '2px solid #FFFFFF',
        borderBottom: isGlowing ? '2px solid #B8860B' : '2px solid #808080',
        borderRight: isGlowing ? '2px solid #B8860B' : '2px solid #808080',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
        transform: combinedTransform,
        boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.4)' : isHovered ? '0 4px 8px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(0,0,0,0.2)',
        zIndex: isDragging ? 200 : isHovered ? 100 : zIndex,
        animation: isGlowing ? 'cardGlow 0.5s ease-in-out' : undefined,
        position: 'relative',
        userSelect: 'none',
        touchAction: 'none',
        ...style,
      }}
    >
      {/* ホバー時またはタップ選択時のツールチップ（ドラッグ中は非表示） */}
      {(isHovered || isSelected) && !isDragging && tooltipContent && (
        <Win98Tooltip>{tooltipContent}</Win98Tooltip>
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
  const { registeredMenus, maxMenuSlots, reorderMenus, removeMenu } = useMenuStore();
  const { hiredStaff, baseBonuses, categoryBonuses, maxStaffSlots, reorderStaff, fireStaff } = useStaffStore();
  const { isOpen } = useRestaurantStore();

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

  const calculateTotal = useCallback(() => {
    if (fanfare.phase === 'animating' || fanfare.phase === 'waiting') {
      return fanfare.displayedTotal;
    }
    return registeredMenus.reduce((sum, menu) => {
      const category = menu.category;
      let price = menu.price;
      if (category) {
        price += baseBonuses[category] || 0;
        price = Math.floor(price * (categoryBonuses[category] || 1));
      }
      return sum + price;
    }, 0);
  }, [fanfare.phase, fanfare.displayedTotal, registeredMenus, baseBonuses, categoryBonuses]);

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
    return price;
  }, [fanfare.phase, fanfare.menuBonuses, registeredMenus, baseBonuses, categoryBonuses]);

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
          if (staff && window.confirm(`本当に${staff.name}を解雇しますか？`)) {
            fireStaff(staff.id);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 20 }}>
                <span style={{ fontSize: 10, color: '#000000', fontWeight: 'bold', marginRight: 4, width: 45 }}>
                  スタッフ
                </span>
                <div
                  style={{
                    display: 'flex',
                    paddingRight: CARD_OVERLAP,
                  }}
                >
                  {hiredStaff.map((staff, index) => {
                    const isGlowing = fanfare.glowingStaffId === staff.id;
                    const isDragging = dragState?.type === 'staff' && dragState.fromIndex === index;
                    const isHovered = activeTooltip?.type === 'staff' && activeTooltip.id === staff.id && !isDragging;
                    const { offsetX, offsetY } = getDisplayOrder('staff', index);
                    return (
                      <div
                        key={staff.id}
                        style={{
                          marginLeft: index === 0 ? 0 : -CARD_OVERLAP,
                          zIndex: isDragging ? 200 : isHovered ? 100 : hiredStaff.length - index,
                          transition: isDragging ? 'none' : 'transform 0.15s ease',
                        }}
                      >
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
                      </div>
                    );
                  })}
                  {hiredStaff.length < maxStaffSlots && (
                    <div style={{ marginLeft: hiredStaff.length === 0 ? 0 : -CARD_OVERLAP }}>
                      <EmptyCard />
                    </div>
                  )}
                </div>
              </div>

              {/* メニューカード行 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 20 }}>
                <span style={{ fontSize: 10, color: '#000000', fontWeight: 'bold', marginRight: 4, width: 45 }}>
                  メニュー
                </span>
                <div
                  style={{
                    display: 'flex',
                    paddingRight: CARD_OVERLAP,
                  }}
                >
                  {Array.from({ length: maxMenuSlots }).map((_, index) => {
                    const menu = registeredMenus[index];
                    const isGlowing = fanfare.glowingMenuIndex === index;
                    const isDragging = dragState?.type === 'menu' && dragState.fromIndex === index;
                    const isHovered = activeTooltip?.type === 'menu' && activeTooltip.index === index && !isDragging;
                    const displayPrice = getMenuDisplayPrice(index);
                    const { offsetX, offsetY } = menu ? getDisplayOrder('menu', index) : { offsetX: 0, offsetY: 0 };

                    return (
                      <div
                        key={menu?.id ?? `empty-${index}`}
                        style={{
                          marginLeft: index === 0 ? 0 : -CARD_OVERLAP,
                          zIndex: isDragging ? 200 : isHovered ? 100 : maxMenuSlots - index,
                          transition: isDragging ? 'none' : 'transform 0.15s ease',
                        }}
                      >
                        {menu ? (
                          <Card
                            iconUrl={menu.iconUrl}
                            name={menu.name}
                            subText={`${displayPrice}`}
                            category={menu.category}
                            isGlowing={isGlowing}
                            isHovered={isHovered}
                            isDragging={isDragging}
                            isSelected={selectedMenuIndex === index}
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
                            tooltipContent={
                              <div>
                                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{menu.name}</div>
                                <div>基本価格: {menu.price}円</div>
                                {displayPrice !== menu.price && (
                                  <div style={{ color: '#006600', fontWeight: 'bold' }}>
                                    ボーナス後: {displayPrice}円
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
                            }
                          />
                        ) : (
                          <EmptyCard />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 右側: ゴミ箱と客単価（編成パネル内、折りたたみ時は非表示） */}
        {!staffMenuCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
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
    </div>
  );
}
