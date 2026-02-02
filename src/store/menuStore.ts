import { create } from 'zustand';
import type { MenuItem } from '../types';
import { useRestaurantStore } from './restaurantStore';
import { MAX_MENU_SLOTS } from '../constants/game';
import { getRandomMenuOptions } from '../data/menuPool';

// メニュー選択で表示する選択肢の数
const MENU_SELECT_COUNT = 3;

interface MenuState {
  // 現在登録されているメニュー
  registeredMenus: MenuItem[];
  // 最大登録数
  maxMenuSlots: number;
  // ゲームが開始されたか（タイトル画面から遷移したか）
  gameStarted: boolean;

  // メニュー選択ウィンドウ用
  showMenuSelect: boolean;
  menuSelectOptions: MenuItem[];
  // 入れ替えモード（枠がいっぱいの場合、新しいメニューを選んだ後）
  isReplaceMode: boolean;
  // 選択中の新しいメニューID（入れ替えモード用）
  pendingMenuId: string | null;

  // Actions
  addMenu: (menu: MenuItem) => void;
  removeMenu: (menuId: string) => void;
  replaceMenu: (oldId: string, newMenu: MenuItem) => void;
  reorderMenus: (fromIndex: number, toIndex: number) => void; // 順番入れ替え
  openMenuSelect: () => void;
  closeMenuSelect: () => void;
  selectMenu: (menuId: string) => void;
  confirmReplace: (oldMenuId: string) => void; // 入れ替え対象を選んで確定
  cancelReplace: () => void; // 入れ替えをキャンセル
  startGame: () => void;
  increaseMaxMenuSlots: () => void; // メニュー枠を1増やす
  reset: () => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  registeredMenus: [],
  maxMenuSlots: MAX_MENU_SLOTS,
  gameStarted: false,

  showMenuSelect: false,
  menuSelectOptions: [],
  isReplaceMode: false,
  pendingMenuId: null,

  addMenu: (menu: MenuItem) => {
    const { registeredMenus, maxMenuSlots } = get();
    if (registeredMenus.length >= maxMenuSlots) return;
    // 既に登録済みのメニューは追加しない
    if (registeredMenus.some((m) => m.id === menu.id)) return;
    set({ registeredMenus: [...registeredMenus, menu] });
  },

  removeMenu: (menuId: string) => {
    const { registeredMenus } = get();
    set({ registeredMenus: registeredMenus.filter((m) => m.id !== menuId) });
  },

  replaceMenu: (oldId: string, newMenu: MenuItem) => {
    const { registeredMenus } = get();
    const newMenus = registeredMenus
      .filter((m) => m.id !== oldId)
      .concat(newMenu);
    set({ registeredMenus: newMenus });
  },

  reorderMenus: (fromIndex: number, toIndex: number) => {
    const { registeredMenus } = get();
    if (fromIndex < 0 || fromIndex >= registeredMenus.length) return;
    if (toIndex < 0 || toIndex >= registeredMenus.length) return;

    const newMenus = [...registeredMenus];
    const [moved] = newMenus.splice(fromIndex, 1);
    newMenus.splice(toIndex, 0, moved);
    set({ registeredMenus: newMenus });
  },

  openMenuSelect: () => {
    const { registeredMenus } = get();
    const excludeIds = registeredMenus.map((m) => m.id);
    const options = getRandomMenuOptions(MENU_SELECT_COUNT, excludeIds);

    set({
      showMenuSelect: true,
      menuSelectOptions: options,
      isReplaceMode: false,
      pendingMenuId: null,
    });
  },

  closeMenuSelect: () => {
    set({
      showMenuSelect: false,
      menuSelectOptions: [],
      isReplaceMode: false,
      pendingMenuId: null,
    });
  },

  selectMenu: (menuId: string) => {
    const { menuSelectOptions, registeredMenus, maxMenuSlots, addMenu } = get();
    const menu = menuSelectOptions.find((m) => m.id === menuId);
    if (!menu) return;

    const slotsFull = registeredMenus.length >= maxMenuSlots;

    if (slotsFull) {
      // 枠がいっぱい: 入れ替えモードに移行（新しいメニューを選択済み）
      set({
        isReplaceMode: true,
        pendingMenuId: menuId,
      });
    } else {
      // 通常モード: メニューを追加
      addMenu(menu);
      set({
        showMenuSelect: false,
        menuSelectOptions: [],
      });
    }
  },

  confirmReplace: (oldMenuId: string) => {
    const { menuSelectOptions, pendingMenuId, replaceMenu } = get();
    if (!pendingMenuId) return;

    const newMenu = menuSelectOptions.find((m) => m.id === pendingMenuId);
    if (!newMenu) return;

    replaceMenu(oldMenuId, newMenu);
    set({
      showMenuSelect: false,
      menuSelectOptions: [],
      isReplaceMode: false,
      pendingMenuId: null,
    });
  },

  cancelReplace: () => {
    set({
      isReplaceMode: false,
      pendingMenuId: null,
    });
  },

  startGame: () => {
    set({ gameStarted: true });
    // ゲーム開始時に一時停止を解除
    useRestaurantStore.setState({ isPaused: false });
  },

  increaseMaxMenuSlots: () => {
    set((state) => ({ maxMenuSlots: state.maxMenuSlots + 1 }));
  },

  reset: () => {
    set({
      registeredMenus: [],
      maxMenuSlots: MAX_MENU_SLOTS,
      gameStarted: false,
      showMenuSelect: false,
      menuSelectOptions: [],
      isReplaceMode: false,
      pendingMenuId: null,
    });
  },
}));
