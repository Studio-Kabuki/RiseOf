import { useShopStore, useRestaurantStore, useMenuStore } from '../store';
import type { MenuItem } from '../types';
import { WindowDialog, WindowButton } from './ui';

// メニュー購入に必要なLIT
const MENU_COST_LIT = 1;

// Windows 98 風スタイル定義
const styles = {
  itemsContainer: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    marginBottom: '16px',
  },
  menuCard: {
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
  menuCardPressed: {
    borderTop: '2px solid #808080',
    borderLeft: '2px solid #808080',
    borderBottom: '2px solid #DFDFDF',
    borderRight: '2px solid #DFDFDF',
  },
  menuCardDisabled: {
    backgroundColor: '#F0F0F0',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  menuCardSoldOut: {
    backgroundColor: '#E8E8E8',
    cursor: 'default',
    opacity: 0.8,
  },
  menuIcon: {
    width: '40px',
    height: '40px',
    marginBottom: '6px',
  },
  menuName: {
    fontSize: '11px',
    fontWeight: 'bold' as const,
    color: '#000000',
    marginBottom: '2px',
  },
  menuPrice: {
    fontSize: '10px',
    color: '#000000',
    marginBottom: '2px',
  },
  menuTime: {
    fontSize: '9px',
    color: '#404040',
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
};

interface ShopItemProps {
  menu: MenuItem;
  canBuy: boolean;
  isSoldOut: boolean;
  onPurchase: () => void;
}

function ShopItem({ menu, canBuy, isSoldOut, onPurchase }: ShopItemProps) {
  const isClickable = canBuy && !isSoldOut;

  return (
    <div
      style={{
        ...styles.menuCard,
        ...(isSoldOut ? styles.menuCardSoldOut : !canBuy ? styles.menuCardDisabled : {}),
      }}
      onClick={() => isClickable && onPurchase()}
      onMouseDown={(e) => {
        if (isClickable) {
          e.currentTarget.style.borderTop = '2px solid #808080';
          e.currentTarget.style.borderLeft = '2px solid #808080';
          e.currentTarget.style.borderBottom = '2px solid #DFDFDF';
          e.currentTarget.style.borderRight = '2px solid #DFDFDF';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      onMouseUp={(e) => {
        if (isClickable) {
          e.currentTarget.style.borderTop = '2px solid #DFDFDF';
          e.currentTarget.style.borderLeft = '2px solid #DFDFDF';
          e.currentTarget.style.borderBottom = '2px solid #808080';
          e.currentTarget.style.borderRight = '2px solid #808080';
          e.currentTarget.style.boxShadow = '1px 1px 0 #404040';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderTop = '2px solid #DFDFDF';
        e.currentTarget.style.borderLeft = '2px solid #DFDFDF';
        e.currentTarget.style.borderBottom = '2px solid #808080';
        e.currentTarget.style.borderRight = '2px solid #808080';
        e.currentTarget.style.boxShadow = '1px 1px 0 #404040';
      }}
    >
      {/* SOLD OUT バッジ */}
      {isSoldOut && (
        <div style={styles.soldOutBadge}>SOLD OUT</div>
      )}

      <img
        src={menu.iconUrl}
        alt={menu.name}
        style={{
          ...styles.menuIcon,
          opacity: isSoldOut ? 0.5 : 1,
        }}
      />
      <div style={{
        ...styles.menuName,
        opacity: isSoldOut ? 0.5 : 1,
      }}>
        {menu.name}
      </div>
      <div style={{
        ...styles.menuPrice,
        color: '#006400',
        fontWeight: 'bold',
        opacity: isSoldOut ? 0.5 : 1,
      }}>
        売値: {menu.price}円
      </div>
      <div style={{
        ...styles.menuTime,
        opacity: isSoldOut ? 0.5 : 1,
      }}>
        調理: {menu.cookingTime}秒
      </div>
      {!isSoldOut && (
        <div style={{
          fontSize: '10px',
          color: '#ff6600',
          fontWeight: 'bold',
          marginTop: '4px',
        }}>
          🔥 {MENU_COST_LIT} LIT
        </div>
      )}
    </div>
  );
}

export function ShopWindow() {
  const {
    isOpen,
    lineup,
    closeShop,
    reroll,
    purchaseMenu,
    isSoldOut,
    getRerollCost,
  } = useShopStore();
  const { lit, spendLit, money } = useRestaurantStore();
  const { registeredMenus, maxMenuSlots } = useMenuStore();

  if (!isOpen) return null;

  const rerollCost = getRerollCost();
  const canAffordMenu = lit >= MENU_COST_LIT;
  const canAffordReroll = money >= rerollCost;
  const canAddMore = registeredMenus.length < maxMenuSlots;

  const handleReroll = () => {
    if (canAffordReroll) {
      reroll();
    }
  };

  const handlePurchase = (menuId: string) => {
    if (canAffordMenu && canAddMore && !isSoldOut(menuId)) {
      if (spendLit(MENU_COST_LIT)) {
        purchaseMenu(menuId);
      }
    }
  };

  const footerContent = (
    <>
      <div style={{ fontSize: '12px', color: '#333' }}>
        <span style={{ marginRight: '12px' }}>
          🔥 <strong style={{ color: '#ff6600' }}>{lit} LIT</strong>
        </span>
        <span>
          💰 <strong style={{ color: '#006400' }}>{money}円</strong>
        </span>
      </div>
      <WindowButton
        onClick={handleReroll}
        disabled={!canAffordReroll}
        size="small"
      >
        リロール ({rerollCost}円)
      </WindowButton>
    </>
  );

  return (
    <WindowDialog
      title="ショップ"
      width="550px"
      onClose={closeShop}
      zIndex={1050}
      footer={footerContent}
      contentPadding="16px"
    >
      {/* ヘッダー */}
      <div style={{ textAlign: 'center', marginBottom: '12px', color: '#333', fontSize: '14px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          メニューを購入してレパートリーを増やそう！
        </div>
        <div style={{ fontSize: '11px', color: '#666' }}>
          ラインナップは毎日更新されます
        </div>
      </div>

      {/* スロット情報 */}
      <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginBottom: '8px' }}>
        メニュー枠: {registeredMenus.length} / {maxMenuSlots}
        {!canAddMore && (
          <span style={{ color: '#cc0000', marginLeft: '8px' }}>
            (枠がいっぱいです)
          </span>
        )}
      </div>

      {/* 商品一覧 */}
      <div style={styles.itemsContainer}>
        {lineup.map((menu) => (
          <ShopItem
            key={menu.id}
            menu={menu}
            canBuy={canAffordMenu && canAddMore}
            isSoldOut={isSoldOut(menu.id)}
            onPurchase={() => handlePurchase(menu.id)}
          />
        ))}
        {lineup.length === 0 && (
          <div style={{ color: '#999', fontSize: '12px', padding: '20px' }}>
            売り切れです
          </div>
        )}
      </div>
    </WindowDialog>
  );
}
