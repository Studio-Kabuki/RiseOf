import { useShopStore, useRestaurantStore, useStaffStore } from '../store';
import type { StaffDefinition } from '../types/staffDefinition';
import { WindowDialog, WindowButton } from './ui';

// Windows 98 風スタイル定義
const styles = {
  itemsContainer: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    marginBottom: '16px',
  },
  staffCard: {
    width: '90px',
    padding: '10px',
    backgroundColor: '#FFFFFF',
    border: 'none',
    borderTop: '2px solid #DFDFDF',
    borderLeft: '2px solid #DFDFDF',
    borderBottom: '2px solid #808080',
    borderRight: '2px solid #808080',
    borderRadius: 0,
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'none',
    position: 'relative' as const,
    fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
    boxShadow: '1px 1px 0 #404040',
  },
  staffCardDisabled: {
    backgroundColor: '#F0F0F0',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  staffCardSoldOut: {
    backgroundColor: '#E8E8E8',
    cursor: 'default',
    opacity: 0.8,
  },
  staffIcon: {
    width: '40px',
    height: '40px',
    marginBottom: '6px',
  },
  staffName: {
    fontSize: '11px',
    fontWeight: 'bold' as const,
    color: '#000000',
    marginBottom: '2px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1.2',
  },
  staffDescription: {
    fontSize: '9px',
    color: '#333',
    marginTop: '4px',
    whiteSpace: 'pre-line' as const,
    lineHeight: '1.3',
    textAlign: 'left' as const,
  },
  soldOutBadge: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-15deg)',
    backgroundColor: '#800000',
    color: 'white',
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    borderRadius: 0,
    whiteSpace: 'nowrap' as const,
    zIndex: 10,
    border: '1px solid #400000',
  },
  hiredStaff: {
    width: '70px',
    padding: '8px',
    backgroundColor: '#F0F0F0',
    borderTop: '1px solid #808080',
    borderLeft: '1px solid #808080',
    borderBottom: '1px solid #FFFFFF',
    borderRight: '1px solid #FFFFFF',
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  hiredStaffSelected: {
    backgroundColor: '#FFE0E0',
    borderTop: '2px solid #800000',
    borderLeft: '2px solid #800000',
    borderBottom: '2px solid #400000',
    borderRight: '2px solid #400000',
  },
};

// アイコンURLのベースパス
const ICON_BASE_URL = 'https://img.icons8.com/color/96/';

interface ShopItemProps {
  staff: StaffDefinition;
  canBuy: boolean;
  isSoldOut: boolean;
  onPurchase: () => void;
}

function ShopItem({ staff, canBuy, isSoldOut, onPurchase }: ShopItemProps) {
  const isClickable = canBuy && !isSoldOut;

  const applyPressedStyle = (el: HTMLElement) => {
    el.style.borderTop = '2px solid #808080';
    el.style.borderLeft = '2px solid #808080';
    el.style.borderBottom = '2px solid #DFDFDF';
    el.style.borderRight = '2px solid #DFDFDF';
    el.style.boxShadow = 'none';
  };

  const applyNormalStyle = (el: HTMLElement) => {
    el.style.borderTop = '2px solid #DFDFDF';
    el.style.borderLeft = '2px solid #DFDFDF';
    el.style.borderBottom = '2px solid #808080';
    el.style.borderRight = '2px solid #808080';
    el.style.boxShadow = '1px 1px 0 #404040';
  };

  // アイコンURLを構築
  const iconUrl = staff.iconUrl.startsWith('http')
    ? staff.iconUrl
    : `${ICON_BASE_URL}${staff.iconUrl}`;

  return (
    <div
      style={{
        ...styles.staffCard,
        ...(isSoldOut
          ? styles.staffCardSoldOut
          : !canBuy
            ? styles.staffCardDisabled
            : {}),
        WebkitTapHighlightColor: 'transparent',
      }}
      onClick={() => isClickable && onPurchase()}
      onMouseDown={(e) => isClickable && applyPressedStyle(e.currentTarget)}
      onMouseUp={(e) => isClickable && applyNormalStyle(e.currentTarget)}
      onMouseLeave={(e) => applyNormalStyle(e.currentTarget)}
      onTouchStart={(e) => isClickable && applyPressedStyle(e.currentTarget)}
      onTouchEnd={(e) => isClickable && applyNormalStyle(e.currentTarget)}
      onTouchCancel={(e) => applyNormalStyle(e.currentTarget)}
    >
      {/* SOLD OUT バッジ */}
      {isSoldOut && <div style={styles.soldOutBadge}>SOLD OUT</div>}

      <img
        src={iconUrl}
        alt={staff.name}
        style={{
          ...styles.staffIcon,
          opacity: isSoldOut ? 0.5 : 1,
        }}
      />
      <div
        style={{
          ...styles.staffName,
          opacity: isSoldOut ? 0.5 : 1,
        }}
      >
        {staff.name}
      </div>
      {staff.description && (
        <div
          style={{
            ...styles.staffDescription,
            opacity: isSoldOut ? 0.5 : 1,
          }}
        >
          {staff.description}
        </div>
      )}
      {!isSoldOut && (
        <div
          style={{
            fontSize: '10px',
            color: '#ff6600',
            fontWeight: 'bold',
            marginTop: '4px',
          }}
        >
          🔥 {staff.cost} LIT
        </div>
      )}
    </div>
  );
}

interface HiredStaffItemProps {
  staff: StaffDefinition;
  onSelect: () => void;
}

function HiredStaffItem({ staff, onSelect }: HiredStaffItemProps) {
  const iconUrl = staff.iconUrl.startsWith('http')
    ? staff.iconUrl
    : `${ICON_BASE_URL}${staff.iconUrl}`;

  return (
    <div style={styles.hiredStaff} onClick={onSelect}>
      <img
        src={iconUrl}
        alt={staff.name}
        style={{ width: '32px', height: '32px', marginBottom: '4px' }}
      />
      <div style={{ fontSize: '9px', color: '#333' }}>{staff.name}</div>
    </div>
  );
}

export function ShopWindow() {
  const {
    isOpen,
    lineup,
    closeShop,
    reroll,
    purchaseStaff,
    confirmReplace,
    cancelReplace,
    isSoldOut,
    getRerollCost,
    isReplaceMode,
    pendingPurchaseId,
  } = useShopStore();
  const { lit } = useRestaurantStore();
  const { hiredStaff, maxStaffSlots } = useStaffStore();

  if (!isOpen) return null;

  const rerollCost = getRerollCost();
  const canAffordReroll = lit >= rerollCost;
  const canAddMore = hiredStaff.length < maxStaffSlots;

  const handleReroll = () => {
    if (canAffordReroll) {
      reroll();
    }
  };

  const handlePurchase = (staffId: string) => {
    const staff = lineup.find((s) => s.id === staffId);
    if (!staff) return;

    const canAfford = lit >= staff.cost;
    if (canAfford && !isSoldOut(staffId)) {
      purchaseStaff(staffId);
    }
  };

  const handleConfirmReplace = (oldStaffId: string) => {
    confirmReplace(oldStaffId);
  };

  const pendingStaff = lineup.find((s) => s.id === pendingPurchaseId);

  const footerContent = (
    <>
      <div style={{ fontSize: '12px', color: '#333' }}>
        <span>
          🔥 <strong style={{ color: '#ff6600' }}>{lit} LIT</strong>
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <WindowButton
          onClick={handleReroll}
          disabled={!canAffordReroll}
          size="small"
        >
          リロール ({rerollCost} LIT)
        </WindowButton>
        <WindowButton onClick={closeShop} size="small">
          閉じる
        </WindowButton>
      </div>
    </>
  );

  return (
    <WindowDialog
      title="店員ショップ"
      width="550px"
      onClose={closeShop}
      zIndex={1050}
      footer={footerContent}
      contentPadding="16px"
    >
      {/* ヘッダー */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '12px',
          color: '#333',
          fontSize: '14px',
        }}
      >
        {isReplaceMode ? (
          <>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              店員枠がいっぱいです
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              入れ替えたい店員を選んでください
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              店員を雇ってお店を強化しよう！
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              ラインナップは毎日更新されます
            </div>
          </>
        )}
      </div>

      {/* スロット情報 */}
      <div
        style={{
          fontSize: '11px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '8px',
        }}
      >
        店員枠: {hiredStaff.length} / {maxStaffSlots}
        {!canAddMore && !isReplaceMode && (
          <span style={{ color: '#cc0000', marginLeft: '8px' }}>
            (枠がいっぱいです - 入れ替え可能)
          </span>
        )}
      </div>

      {/* 入れ替えモード: 現在の店員表示 */}
      {isReplaceMode && pendingStaff && (
        <div
          style={{
            backgroundColor: '#FFFACD',
            padding: '12px',
            marginBottom: '16px',
            borderTop: '1px solid #808080',
            borderLeft: '1px solid #808080',
            borderBottom: '1px solid #FFFFFF',
            borderRight: '1px solid #FFFFFF',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            「{pendingStaff.name}」を雇用します（{pendingStaff.cost} LIT）
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            解雇する店員をクリックしてください
          </div>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {hiredStaff.map((staff) => (
              <HiredStaffItem
                key={staff.id}
                staff={staff}
                onSelect={() => handleConfirmReplace(staff.id)}
              />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <WindowButton onClick={cancelReplace} size="small">
              キャンセル
            </WindowButton>
          </div>
        </div>
      )}

      {/* 商品一覧 */}
      {!isReplaceMode && (
        <div style={styles.itemsContainer}>
          {lineup.map((staff) => {
            const canAfford = lit >= staff.cost;
            return (
              <ShopItem
                key={staff.id}
                staff={staff}
                canBuy={canAfford}
                isSoldOut={isSoldOut(staff.id)}
                onPurchase={() => handlePurchase(staff.id)}
              />
            );
          })}
          {lineup.length === 0 && (
            <div style={{ color: '#999', fontSize: '12px', padding: '20px' }}>
              店員がいません
            </div>
          )}
        </div>
      )}

      {/* 雇用済み店員 */}
      {hiredStaff.length > 0 && !isReplaceMode && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #C0C0C0',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            雇用中の店員
          </div>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {hiredStaff.map((staff) => {
              const iconUrl = staff.iconUrl.startsWith('http')
                ? staff.iconUrl
                : `${ICON_BASE_URL}${staff.iconUrl}`;
              return (
                <div
                  key={staff.id}
                  style={{
                    width: '60px',
                    padding: '6px',
                    backgroundColor: '#E8E8E8',
                    borderTop: '1px solid #FFFFFF',
                    borderLeft: '1px solid #FFFFFF',
                    borderBottom: '1px solid #808080',
                    borderRight: '1px solid #808080',
                    textAlign: 'center',
                  }}
                >
                  <img
                    src={iconUrl}
                    alt={staff.name}
                    style={{ width: '28px', height: '28px', marginBottom: '2px' }}
                  />
                  <div style={{ fontSize: '8px', color: '#333' }}>
                    {staff.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </WindowDialog>
  );
}
