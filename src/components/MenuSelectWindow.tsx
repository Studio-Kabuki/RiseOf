import { useMenuStore, useShopStore } from '../store';
import type { MenuItem } from '../types';
import { WindowDialog, WindowButton } from './ui';

// Windows 98 風スタイル定義
const styles = {
  itemsContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    marginBottom: '16px',
  },
  menuCard: {
    width: '120px',
    padding: '12px',
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
  menuCardSelected: {
    backgroundColor: '#E0FFE0',
    borderTop: '2px solid #006400',
    borderLeft: '2px solid #006400',
    borderBottom: '2px solid #003300',
    borderRight: '2px solid #003300',
  },
  menuIcon: {
    width: '48px',
    height: '48px',
    marginBottom: '8px',
  },
  menuName: {
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#000000',
    marginBottom: '4px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1.2',
  },
  menuPrice: {
    fontSize: '14px',
    color: '#006400',
    fontWeight: 'bold' as const,
    marginBottom: '4px',
  },
  menuDescription: {
    fontSize: '10px',
    color: '#333',
    marginTop: '4px',
    whiteSpace: 'pre-line' as const,
    lineHeight: '1.3',
    textAlign: 'left' as const,
  },
  registeredMenu: {
    width: '80px',
    padding: '8px',
    backgroundColor: '#F0F0F0',
    borderTop: '1px solid #808080',
    borderLeft: '1px solid #808080',
    borderBottom: '1px solid #FFFFFF',
    borderRight: '1px solid #FFFFFF',
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
};

interface MenuCardProps {
  menu: MenuItem;
  isSelected: boolean;
  onSelect: () => void;
}

function MenuCard({ menu, isSelected, onSelect }: MenuCardProps) {
  const applyPressedStyle = (el: HTMLElement) => {
    el.style.borderTop = '2px solid #808080';
    el.style.borderLeft = '2px solid #808080';
    el.style.borderBottom = '2px solid #DFDFDF';
    el.style.borderRight = '2px solid #DFDFDF';
    el.style.boxShadow = 'none';
  };

  const applyNormalStyle = (el: HTMLElement) => {
    if (isSelected) return;
    el.style.borderTop = '2px solid #DFDFDF';
    el.style.borderLeft = '2px solid #DFDFDF';
    el.style.borderBottom = '2px solid #808080';
    el.style.borderRight = '2px solid #808080';
    el.style.boxShadow = '1px 1px 0 #404040';
  };

  return (
    <div
      style={{
        ...styles.menuCard,
        ...(isSelected ? styles.menuCardSelected : {}),
        WebkitTapHighlightColor: 'transparent',
      }}
      onClick={onSelect}
      onMouseDown={(e) => applyPressedStyle(e.currentTarget)}
      onMouseUp={(e) => applyNormalStyle(e.currentTarget)}
      onMouseLeave={(e) => applyNormalStyle(e.currentTarget)}
      onTouchStart={(e) => applyPressedStyle(e.currentTarget)}
      onTouchEnd={(e) => applyNormalStyle(e.currentTarget)}
      onTouchCancel={(e) => applyNormalStyle(e.currentTarget)}
    >
      <img src={menu.iconUrl} alt={menu.name} style={styles.menuIcon} />
      <div style={styles.menuName}>{menu.name}</div>
      <div style={styles.menuPrice}>+{menu.price}G</div>
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
        調理: {menu.cookingTime}秒
      </div>
      {menu.description && (
        <div style={styles.menuDescription}>{menu.description}</div>
      )}
    </div>
  );
}

interface RegisteredMenuItemProps {
  menu: MenuItem;
  onSelect: () => void;
}

function RegisteredMenuItem({ menu, onSelect }: RegisteredMenuItemProps) {
  return (
    <div style={styles.registeredMenu} onClick={onSelect}>
      <img
        src={menu.iconUrl}
        alt={menu.name}
        style={{ width: '32px', height: '32px', marginBottom: '4px' }}
      />
      <div style={{ fontSize: '10px', color: '#333' }}>{menu.name}</div>
    </div>
  );
}

export function MenuSelectWindow() {
  const {
    showMenuSelect,
    menuSelectOptions,
    isReplaceMode,
    pendingMenuId,
    registeredMenus,
    maxMenuSlots,
    selectMenu,
    confirmReplace,
    cancelReplace,
    closeMenuSelect,
  } = useMenuStore();
  const { openShop } = useShopStore();

  if (!showMenuSelect) return null;

  const slotsFull = registeredMenus.length >= maxMenuSlots;
  const pendingMenu = menuSelectOptions.find((m) => m.id === pendingMenuId);

  const handleSelectNewMenu = (menuId: string) => {
    selectMenu(menuId);
    // 枠がいっぱいでない場合のみショップを開く
    if (!slotsFull) {
      openShop();
    }
  };

  const handleConfirmReplace = (oldMenuId: string) => {
    confirmReplace(oldMenuId);
    openShop();
  };

  return (
    <WindowDialog
      title="メニューを選択"
      width="500px"
      zIndex={1100}
      closeDisabled
      contentPadding="16px"
    >
      {/* ヘッダー */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '16px',
          color: '#333',
          fontSize: '14px',
        }}
      >
        {isReplaceMode ? (
          <>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              メニュー枠がいっぱいです
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              入れ替えたいメニューを選んでください
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              今日のメニューを1つ選んでください
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              選んだメニューがレパートリーに追加されます
            </div>
          </>
        )}
      </div>

      {/* 入れ替えモード: 現在のメニュー表示 */}
      {isReplaceMode && pendingMenu && (
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
            「{pendingMenu.name}」を追加します
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            削除するメニューをクリックしてください
          </div>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {registeredMenus.map((menu) => (
              <RegisteredMenuItem
                key={menu.id}
                menu={menu}
                onSelect={() => handleConfirmReplace(menu.id)}
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

      {/* 新しいメニュー選択肢 */}
      {!isReplaceMode && (
        <div style={styles.itemsContainer}>
          {menuSelectOptions.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              isSelected={false}
              onSelect={() => handleSelectNewMenu(menu.id)}
            />
          ))}
        </div>
      )}

      {/* 通常モード: スキップボタン */}
      {!isReplaceMode && (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <WindowButton
            onClick={() => {
              closeMenuSelect();
              openShop();
            }}
            size="small"
          >
            スキップ
          </WindowButton>
        </div>
      )}
    </WindowDialog>
  );
}
