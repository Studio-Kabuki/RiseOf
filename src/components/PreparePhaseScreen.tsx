import { useState, useEffect } from 'react';
import { useShopStore } from '../store/shopStore';
import { useMenuStore } from '../store/menuStore';
import { useStaffStore } from '../store/staffStore';
import { useRestaurantStore } from '../store/restaurantStore';
import { getRandomMenuOptions } from '../data/menuPool';
import type { MenuItem } from '../types';
import type { StaffDefinition } from '../types/staffDefinition';
import { CATEGORY_INFO } from '../types/menu';

type ScreenPhase = 'menu' | 'staff';

// 履歴書風カード（スタッフ用）
function StaffResumeCard({ staff, disabled, onClick }: { staff: StaffDefinition; disabled?: boolean; onClick?: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 140,
        backgroundColor: disabled ? '#E0E0E0' : '#FFFFF8',
        border: '1px solid #000000',
        padding: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: isHovered && !disabled ? 'translateY(-4px)' : 'none',
        boxShadow: isHovered && !disabled ? '0 4px 8px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(0,0,0,0.2)',
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
          <img src={staff.iconUrl} alt={staff.name} style={{ width: 40, height: 40 }} draggable={false} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: '#000080', marginBottom: 2 }}>
            {staff.name}
          </div>
          <div style={{ fontSize: 9, color: '#666666' }}>
            {staff.description}
          </div>
        </div>
      </div>
      <button
        disabled={disabled}
        style={{
          width: '100%',
          padding: '4px 8px',
          backgroundColor: disabled ? '#A0A0A0' : '#90EE90',
          borderTop: '2px solid #FFFFFF',
          borderLeft: '2px solid #FFFFFF',
          borderBottom: '2px solid #404040',
          borderRight: '2px solid #404040',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 11,
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
  const { registeredMenus, addMenu, removeMenu } = useMenuStore();

  const [phase, setPhase] = useState<ScreenPhase>('menu'); // メニュー選択から開始
  const [menuOptions, setMenuOptions] = useState<MenuItem[]>([]);

  useEffect(() => {
    const excludeIds = registeredMenus.map((m) => m.id);
    setMenuOptions(getRandomMenuOptions(3, excludeIds));
  }, []);

  useEffect(() => {
    if (lineup.length === 0) {
      refreshLineup();
    }
  }, [lineup.length, refreshLineup]);

  const handleMenuSelect = (menu: MenuItem) => {
    // 既存のメニューをクリアして新しいのを追加
    registeredMenus.forEach((m) => removeMenu(m.id));
    addMenu(menu);
    // スタッフ選択画面へ
    setPhase('staff');
  };

  const handleSkipMenu = () => {
    // スタッフ選択画面へ（メニューなしで）
    setPhase('staff');
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
        /* 求人画面 */
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            backgroundColor: '#000080',
            color: '#FFFFFF',
            padding: '12px 24px',
            marginBottom: 8,
            fontWeight: 'bold',
          }}>
            *** 応募がありました！ ***
          </h2>

          <div style={{ marginBottom: 16, fontSize: 12, color: '#666666' }}>
            ({hiredStaff.length}/{maxStaffSlots}人) | 所持金: <span style={{ color: '#CC0000', fontWeight: 'bold' }}>{lit} LIT</span>
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
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

          <div style={{ marginBottom: 24 }}>
            <RetroButton onClick={() => reroll()} disabled={!canReroll}>
              別の応募者を見る ({rerollCost} LIT)
            </RetroButton>
          </div>

          {hiredStaff.length >= maxStaffSlots && (
            <div style={{ marginBottom: 16, fontSize: 11, color: '#CC0000' }}>
              * 募集枠がいっぱいです
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <RetroButton onClick={handleOpenStore} color="#90EE90">
              開店する
            </RetroButton>
          </div>
        </div>
      )}
    </div>
  );
}
