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
  menuBonuses: Record<number, number>;
  displayedTotal: number;
  glowingStaffId: string | null;
  glowingMenuIndex: number | null;
}

const FANFARE_GLOW_DURATION = 500;
const FANFARE_STEP_DELAY = 200;
const CARD_SIZE = 52; // カードサイズ
const CARD_OVERLAP = 12; // 重なり幅

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

// カード型表示コンポーネント
interface CardProps {
  iconUrl: string;
  name: string;
  subText?: string;
  isGlowing?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  zIndex?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  draggable?: boolean;
}

function Card({
  iconUrl,
  name,
  subText,
  isGlowing,
  isHovered,
  isDragging,
  zIndex = 1,
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragOver,
  onDrop,
  draggable,
}: CardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE + 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isGlowing ? '#FFFFC0' : '#FFFFFF',
        borderTop: isGlowing ? '2px solid #FFD700' : '2px solid #FFFFFF',
        borderLeft: isGlowing ? '2px solid #FFD700' : '2px solid #FFFFFF',
        borderBottom: isGlowing ? '2px solid #B8860B' : '2px solid #808080',
        borderRight: isGlowing ? '2px solid #B8860B' : '2px solid #808080',
        cursor: draggable ? 'grab' : 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: isHovered ? 'translateY(-4px) scale(1.05)' : isDragging ? 'scale(0.95)' : 'none',
        boxShadow: isHovered ? '0 4px 8px rgba(0,0,0,0.3)' : isDragging ? '0 2px 4px rgba(0,0,0,0.2)' : '1px 1px 2px rgba(0,0,0,0.2)',
        zIndex: isHovered ? 100 : zIndex,
        animation: isGlowing ? 'cardGlow 0.5s ease-in-out' : undefined,
        position: 'relative',
        ...style,
      }}
    >
      <img
        src={iconUrl}
        alt={name}
        style={{ width: 32, height: 32, marginBottom: 2 }}
        draggable={false}
      />
      <div
        style={{
          fontSize: 9,
          color: '#000000',
          textAlign: 'center',
          maxWidth: CARD_SIZE - 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
        }}
      >
        {name}
      </div>
      {subText && (
        <div
          style={{
            fontSize: 8,
            color: '#008000',
            fontWeight: 'bold',
            textAlign: 'center',
            fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
          }}
        >
          {subText}
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
        height: CARD_SIZE + 16,
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
      <span style={{ fontSize: 20, color: '#808080' }}>+</span>
    </div>
  );
}

export function StatusPanel() {
  const { registeredMenus, maxMenuSlots, reorderMenus } = useMenuStore();
  const { hiredStaff, baseBonuses, categoryBonuses, maxStaffSlots, reorderStaff } = useStaffStore();
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

  const [hoveredStaffId, setHoveredStaffId] = useState<string | null>(null);
  const [hoveredMenuIndex, setHoveredMenuIndex] = useState<number | null>(null);
  const [draggedStaffIndex, setDraggedStaffIndex] = useState<number | null>(null);
  const [draggedMenuIndex, setDraggedMenuIndex] = useState<number | null>(null);

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

    const menuCategory = menu.params?.category as string | undefined;

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
      const category = menu.params?.category as string | undefined;
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
    const category = menu.params?.category as string | undefined;
    let price = menu.price;
    if (category) {
      price += baseBonuses[category] || 0;
      price = Math.floor(price * (categoryBonuses[category] || 1));
    }
    return price;
  }, [fanfare.phase, fanfare.menuBonuses, registeredMenus, baseBonuses, categoryBonuses]);

  // スタッフドラッグ＆ドロップ
  const handleStaffDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedStaffIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStaffDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleStaffDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedStaffIndex !== null && draggedStaffIndex !== targetIndex && reorderStaff) {
      reorderStaff(draggedStaffIndex, targetIndex);
    }
    setDraggedStaffIndex(null);
  };

  // メニュードラッグ＆ドロップ
  const handleMenuDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedMenuIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMenuDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleMenuDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedMenuIndex !== null && draggedMenuIndex !== targetIndex && reorderMenus) {
      reorderMenus(draggedMenuIndex, targetIndex);
    }
    setDraggedMenuIndex(null);
  };

  return (
    <Panel3D
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '8px 12px',
        margin: '2px 2px 0 2px',
        minHeight: CARD_SIZE + 24,
        flexShrink: 0,
      }}
    >
      {/* スタッフカード */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: '#000000', fontWeight: 'bold', marginRight: 4 }}>
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
            const isHovered = hoveredStaffId === staff.id;
            const isDragging = draggedStaffIndex === index;
            return (
              <div
                key={staff.id}
                style={{
                  marginLeft: index === 0 ? 0 : -CARD_OVERLAP,
                  zIndex: isHovered ? 100 : hiredStaff.length - index,
                }}
              >
                <Card
                  iconUrl={staff.iconUrl}
                  name={staff.name}
                  isGlowing={isGlowing}
                  isHovered={isHovered}
                  isDragging={isDragging}
                  draggable
                  onDragStart={handleStaffDragStart(index)}
                  onDragOver={handleStaffDragOver}
                  onDrop={handleStaffDrop(index)}
                  onMouseEnter={() => setHoveredStaffId(staff.id)}
                  onMouseLeave={() => setHoveredStaffId(null)}
                />
              </div>
            );
          })}
          {hiredStaff.length < maxStaffSlots && (
            <div style={{ marginLeft: hiredStaff.length === 0 ? 0 : -CARD_OVERLAP }}>
              <EmptyCard onClick={openShop} />
            </div>
          )}
        </div>
      </div>

      {/* 区切り */}
      <div style={{ width: 1, height: CARD_SIZE, backgroundColor: '#808080' }} />

      {/* メニューカード */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        <span style={{ fontSize: 10, color: '#000000', fontWeight: 'bold', marginRight: 4 }}>
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
            const isHovered = hoveredMenuIndex === index;
            const isDragging = draggedMenuIndex === index;
            const displayPrice = getMenuDisplayPrice(index);

            return (
              <div
                key={menu?.id ?? `empty-${index}`}
                style={{
                  marginLeft: index === 0 ? 0 : -CARD_OVERLAP,
                  zIndex: isHovered ? 100 : maxMenuSlots - index,
                }}
              >
                {menu ? (
                  <Card
                    iconUrl={menu.iconUrl}
                    name={menu.name}
                    subText={`${displayPrice}円`}
                    isGlowing={isGlowing}
                    isHovered={isHovered}
                    isDragging={isDragging}
                    draggable
                    onDragStart={handleMenuDragStart(index)}
                    onDragOver={handleMenuDragOver}
                    onDrop={handleMenuDrop(index)}
                    onMouseEnter={() => setHoveredMenuIndex(index)}
                    onMouseLeave={() => setHoveredMenuIndex(null)}
                  />
                ) : (
                  <EmptyCard onClick={openShop} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 客単価 */}
      <Panel3D
        inset
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 16px',
          backgroundColor: '#FFFFF0',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, color: '#404040', marginBottom: 2 }}>客単価</span>
        <span style={{ fontSize: 20, fontWeight: 'bold', color: '#008000' }}>
          {calculateTotal()}円
        </span>
      </Panel3D>

      {/* CSSアニメーション */}
      <style>{`
        @keyframes cardGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); box-shadow: 0 0 10px rgba(255, 215, 0, 0.8); }
        }
      `}</style>
    </Panel3D>
  );
}
