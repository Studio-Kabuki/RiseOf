import { useState, useEffect } from 'react';
import { useShopStore } from '../store/shopStore';
import { useMenuStore } from '../store/menuStore';
import { useStaffStore } from '../store/staffStore';
import { useRestaurantStore } from '../store/restaurantStore';
import { getRandomMenuOptions } from '../data/menuPool';
import { getRandomSeasoningOptions } from '../data/seasoningLoader';
import type { MenuItem } from '../types';
import type { StaffDefinition } from '../types/staffDefinition';
import type { SeasoningDefinition } from '../types/seasoning';
import { CATEGORY_INFO } from '../types/menu';

type ScreenPhase = 'menu' | 'shop';

// 履歴書風カード（スタッフ用）
function StaffResumeCard({ staff, disabled, onClick }: { staff: StaffDefinition; disabled?: boolean; onClick?: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 130,
        backgroundColor: disabled ? '#E0E0E0' : '#FFFFF8',
        border: '1px solid #000000',
        padding: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: isHovered && !disabled ? 'translateY(-4px)' : 'none',
        boxShadow: isHovered && !disabled ? '0 4px 8px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(0,0,0,0.2)',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '1px solid #808080',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src={staff.iconUrl} alt={staff.name} style={{ width: 32, height: 32 }} draggable={false} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#000080', marginBottom: 2 }}>
            {staff.name}
          </div>
          <div style={{ fontSize: 8, color: '#666666' }}>
            {staff.description}
          </div>
        </div>
      </div>
      <button
        disabled={disabled}
        style={{
          width: '100%',
          padding: '3px 6px',
          backgroundColor: disabled ? '#A0A0A0' : '#90EE90',
          borderTop: '2px solid #FFFFFF',
          borderLeft: '2px solid #FFFFFF',
          borderBottom: '2px solid #404040',
          borderRight: '2px solid #404040',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 10,
          fontWeight: 'bold',
          fontFamily: 'inherit',
        }}
      >
        {disabled ? 'SOLD OUT' : `雇う ${staff.cost} LIT`}
      </button>
    </div>
  );
}

// 履歴書風カード（メニュー用）
function MenuResumeCard({ menu, onClick }: { menu: MenuItem; onClick?: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const categoryInfo = CATEGORY_INFO[menu.category];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 140,
        backgroundColor: '#FFFFF8',
        border: '1px solid #000000',
        padding: 8,
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: isHovered ? 'translateY(-4px)' : 'none',
        boxShadow: isHovered ? '0 4px 8px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(0,0,0,0.2)',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: '1px solid #808080',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img src={menu.iconUrl} alt={menu.name} style={{ width: 40, height: 40 }} draggable={false} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: '#800000', marginBottom: 4 }}>
            {menu.name}
          </div>
          {/* 価格表示（カテゴリ背景色） */}
          <div
            style={{
              fontSize: 11,
              color: '#FFFFFF',
              fontWeight: 900,
              fontFamily: 'inherit',
              backgroundColor: categoryInfo.color,
              padding: '2px 6px',
              border: '1px solid rgba(0,0,0,0.3)',
              textShadow: '0 1px 1px rgba(0,0,0,0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <span style={{ fontSize: 13 }}>{categoryInfo.icon}</span>
            <span>{menu.price}G</span>
          </div>
          {/* カテゴリ名 */}
          <div style={{ fontSize: 9, color: '#666666', marginTop: 2 }}>
            {categoryInfo.label}
          </div>
          {menu.description && (
            <div style={{ fontSize: 8, color: '#666666', marginTop: 2 }}>
              {menu.description}
            </div>
          )}
        </div>
      </div>
      <button
        style={{
          width: '100%',
          padding: '4px 8px',
          backgroundColor: '#90EE90',
          borderTop: '2px solid #FFFFFF',
          borderLeft: '2px solid #FFFFFF',
          borderBottom: '2px solid #404040',
          borderRight: '2px solid #404040',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 'bold',
          fontFamily: 'inherit',
        }}
      >
        これにする
      </button>
    </div>
  );
}

// シーズニングカード（マウス/タッチイベントベースのドラッグ、Windows98風）
function DraggableSeasoningCard({
  seasoning,
  disabled,
  isDragging,
  onPointerDown,
}: {
  seasoning: SeasoningDefinition;
  disabled?: boolean;
  isDragging?: boolean;
  onPointerDown: (clientX: number, clientY: number, seasoningId: string, cost: number) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    onPointerDown(e.clientX, e.clientY, seasoning.id, seasoning.cost);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    onPointerDown(touch.clientX, touch.clientY, seasoning.id, seasoning.cost);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 130,
        backgroundColor: disabled ? '#D4D0C8' : '#C0C0C0',
        borderTop: disabled ? '2px solid #808080' : '2px solid #FFFFFF',
        borderLeft: disabled ? '2px solid #808080' : '2px solid #FFFFFF',
        borderBottom: disabled ? '2px solid #404040' : '2px solid #404040',
        borderRight: disabled ? '2px solid #404040' : '2px solid #404040',
        padding: 6,
        cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : disabled ? 0.6 : 1,
        transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: isHovered && !disabled && !isDragging ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered && !disabled ? '2px 2px 4px rgba(0,0,0,0.4)' : 'none',
        fontFamily: 'inherit',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderTop: '1px solid #808080',
            borderLeft: '1px solid #808080',
            borderBottom: '1px solid #FFFFFF',
            borderRight: '1px solid #FFFFFF',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src={seasoning.iconUrl} alt={seasoning.name} style={{ width: 32, height: 32 }} draggable={false} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#000080', marginBottom: 2 }}>
            {seasoning.name}
          </div>
          <div style={{ fontSize: 8, color: '#404040' }}>
            {seasoning.description}
          </div>
        </div>
      </div>
      <div
        style={{
          textAlign: 'center',
          fontSize: 10,
          fontWeight: 'bold',
          color: disabled ? '#808080' : '#000000',
          padding: '3px 6px',
          backgroundColor: disabled ? '#C0C0C0' : '#FFFFCC',
          borderTop: '1px solid #808080',
          borderLeft: '1px solid #808080',
          borderBottom: '1px solid #FFFFFF',
          borderRight: '1px solid #FFFFFF',
        }}
      >
        {disabled ? '購入不可' : `${seasoning.cost} LIT`}
      </div>
    </div>
  );
}

// 90年代風ボタン
function RetroButton({ children, onClick, disabled, color }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; color?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 24px',
        backgroundColor: disabled ? '#A0A0A0' : (color || '#C0C0C0'),
        borderTop: '2px solid #FFFFFF',
        borderLeft: '2px solid #FFFFFF',
        borderBottom: '2px solid #404040',
        borderRight: '2px solid #404040',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 14,
        fontFamily: 'inherit',
        fontWeight: 'bold',
      }}
    >
      {children}
    </button>
  );
}

export function PreparePhaseScreen() {
  const { openStore, lit } = useRestaurantStore();
  const { lineup, purchaseStaff, isSoldOut, refreshLineup, reroll, getRerollCost } = useShopStore();
  const { hiredStaff, maxStaffSlots } = useStaffStore();
  const {
    registeredMenus,
    addMenu,
    draggingSeasoningId,
    draggingSeasoningPosition,
    setDraggingSeasoningId,
    setDraggingSeasoningPosition,
  } = useMenuStore();

  const [phase, setPhase] = useState<ScreenPhase>('menu');
  const [menuOptions, setMenuOptions] = useState<MenuItem[]>([]);
  const [seasoningOptions, setSeasoningOptions] = useState<SeasoningDefinition[]>([]);

  useEffect(() => {
    const excludeIds = registeredMenus.map((m) => m.id);
    setMenuOptions(getRandomMenuOptions(3, excludeIds));
  }, []);

  useEffect(() => {
    if (lineup.length === 0) {
      refreshLineup();
    }
  }, [lineup.length, refreshLineup]);

  // ショップ画面に入る時にシーズニングオプションを生成
  useEffect(() => {
    if (phase === 'shop') {
      setSeasoningOptions(getRandomSeasoningOptions(3));
    }
  }, [phase]);

  // シーズニングドラッグ中のマウス/タッチ移動を追跡
  useEffect(() => {
    if (!draggingSeasoningId) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDraggingSeasoningPosition({ x: e.clientX, y: e.clientY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // スクロール防止
      const touch = e.touches[0];
      setDraggingSeasoningPosition({ x: touch.clientX, y: touch.clientY });
    };

    const handleEnd = () => {
      // ドロップ処理はStatusPanel側で行う（位置ベースで判定）
      // ここではドラッグ状態をリセット
      setDraggingSeasoningId(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [draggingSeasoningId, setDraggingSeasoningId, setDraggingSeasoningPosition]);

  const handleMenuSelect = (menu: MenuItem) => {
    // 新しいメニューを追加（既存メニューは保持）
    addMenu(menu);
    // ショップ画面へ
    setPhase('shop');
  };

  const handleSkipMenu = () => {
    setPhase('shop');
  };

  // シーズニングのポインターダウンハンドラー（マウス/タッチ共通）
  const handleSeasoningPointerDown = (clientX: number, clientY: number, seasoningId: string, cost: number) => {
    setDraggingSeasoningId(seasoningId, cost);
    setDraggingSeasoningPosition({ x: clientX, y: clientY });
  };

  const handleOpenStore = () => {
    openStore();
  };

  const handleHire = (staffId: string) => {
    purchaseStaff(staffId);
  };

  const rerollCost = getRerollCost();
  const canReroll = lit >= rerollCost;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
        backgroundColor: '#FFFEF0',
        padding: 16,
        overflow: 'auto',
      }}
    >
      {phase === 'menu' ? (
        /* メニュー選択画面 */
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            backgroundColor: '#800000',
            color: '#FFFFFF',
            padding: '12px 24px',
            marginBottom: 24,
            fontWeight: 'bold',
          }}>
            *** 仕入れの提案がありました！ ***
          </h2>

          <div style={{ marginBottom: 16, fontSize: 14, color: '#666666' }}>
            本日のメニューを1つ選んでください
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
            {menuOptions.map((menu) => (
              <MenuResumeCard
                key={menu.id}
                menu={menu}
                onClick={() => handleMenuSelect(menu)}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <RetroButton onClick={handleSkipMenu}>
              スキップ
            </RetroButton>
          </div>
        </div>
      ) : (
        /* ショップ画面（スタッフ + シーズニング） */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          maxWidth: 700,
        }}>
          {/* メインコンテンツ */}
          <div style={{ flex: 1, textAlign: 'center', overflow: 'auto', paddingBottom: 120 }}>
            <h2 style={{
              backgroundColor: '#4B0082',
              color: '#FFFFFF',
              padding: '10px 20px',
              marginBottom: 8,
              fontWeight: 'bold',
              fontSize: 16,
            }}>
              *** ショップ ***
            </h2>

            <div style={{ marginBottom: 12, fontSize: 12, color: '#666666' }}>
              所持金: <span style={{ color: '#CC0000', fontWeight: 'bold' }}>{lit} LIT</span>
              {' | '}
              スタッフ: {hiredStaff.length}/{maxStaffSlots}人
            </div>

            {/* シーズニングセクション（メニューがあれば常に表示） */}
            {registeredMenus.length > 0 && (
              <>
                <div style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: '#8B4513',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}>
                  🧂 シーズニング（下のメニューにドラッグ&ドロップ！）
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                  {seasoningOptions.map((seasoning) => {
                    const canAfford = lit >= seasoning.cost;
                    return (
                      <DraggableSeasoningCard
                        key={seasoning.id}
                        seasoning={seasoning}
                        disabled={!canAfford}
                        isDragging={draggingSeasoningId === seasoning.id}
                        onPointerDown={handleSeasoningPointerDown}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* スタッフセクション */}
            <div style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: '#000080',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
              👥 スタッフ募集
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              {lineup.map((staff) => {
                const soldOut = isSoldOut(staff.id);
                const canAfford = lit >= staff.cost && hiredStaff.length < maxStaffSlots;
                return (
                  <StaffResumeCard
                    key={staff.id}
                    staff={staff}
                    disabled={soldOut || !canAfford}
                    onClick={() => handleHire(staff.id)}
                  />
                );
              })}
            </div>

            <div style={{ marginBottom: 16 }}>
              <RetroButton onClick={() => reroll()} disabled={!canReroll}>
                別の応募者を見る ({rerollCost} LIT)
              </RetroButton>
            </div>

            {hiredStaff.length >= maxStaffSlots && (
              <div style={{ marginBottom: 12, fontSize: 10, color: '#CC0000' }}>
                * 募集枠がいっぱいです
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <RetroButton onClick={handleOpenStore} color="#90EE90">
                開店する
              </RetroButton>
            </div>
          </div>
        </div>
      )}

      {/* ドラッグ中のシーズニングゴースト（Windows98風） */}
      {draggingSeasoningId && draggingSeasoningPosition && (() => {
        const draggingSeasoning = seasoningOptions.find(s => s.id === draggingSeasoningId);
        if (!draggingSeasoning) return null;
        return (
          <div
            style={{
              position: 'fixed',
              left: draggingSeasoningPosition.x,
              top: draggingSeasoningPosition.y,
              transform: 'translate(-50%, -50%) scale(1.1)',
              pointerEvents: 'none',
              zIndex: 1000,
              width: 130,
              backgroundColor: '#C0C0C0',
              borderTop: '2px solid #FFFFFF',
              borderLeft: '2px solid #FFFFFF',
              borderBottom: '2px solid #404040',
              borderRight: '2px solid #404040',
              padding: 6,
              boxShadow: '4px 4px 8px rgba(0,0,0,0.5)',
              fontFamily: 'inherit',
              opacity: 0.95,
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderTop: '1px solid #808080',
                  borderLeft: '1px solid #808080',
                  borderBottom: '1px solid #FFFFFF',
                  borderRight: '1px solid #FFFFFF',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img src={draggingSeasoning.iconUrl} alt={draggingSeasoning.name} style={{ width: 32, height: 32 }} draggable={false} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 'bold', color: '#000080', marginBottom: 2 }}>
                  {draggingSeasoning.name}
                </div>
                <div style={{ fontSize: 8, color: '#404040' }}>
                  {draggingSeasoning.description}
                </div>
              </div>
            </div>
            <div
              style={{
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 'bold',
                color: '#000000',
                padding: '3px 6px',
                backgroundColor: '#FFFFCC',
                borderTop: '1px solid #808080',
                borderLeft: '1px solid #808080',
                borderBottom: '1px solid #FFFFFF',
                borderRight: '1px solid #FFFFFF',
              }}
            >
              {draggingSeasoning.cost} LIT
            </div>
          </div>
        );
      })()}
    </div>
  );
}
