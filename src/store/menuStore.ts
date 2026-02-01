import { create } from 'zustand';
import type { MenuItem } from '../types';
import { getRandomMenuOptions } from '../data/menuPool';
import { useRestaurantStore } from './restaurantStore';

// 初期メニュースロット数
const INITIAL_MENU_SLOTS = 4;
// 選択肢の数
const SELECTION_OPTIONS_COUNT = 3;

interface MenuState {
  // 現在登録されているメニュー
  registeredMenus: MenuItem[];
  // 最大登録数
  maxMenuSlots: number;
  // 現在の選択肢（3つ）
  currentOptions: MenuItem[];
  // メニュー選択ウィンドウを表示中か
  isSelectionOpen: boolean;
  // ゲームが開始されたか
  gameStarted: boolean;

  // Actions
  openSelection: () => void;
  closeSelection: () => void;
  selectMenu: (menuId: string) => void;
  refreshOptions: () => void;
  startGame: () => void;
  reset: () => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  registeredMenus: [],
  maxMenuSlots: INITIAL_MENU_SLOTS,
  currentOptions: [],
  isSelectionOpen: false, // タイトル画面からゲームスタート時に開く
  gameStarted: false,

  openSelection: () => {
    const { registeredMenus } = get();
    const excludeIds = registeredMenus.map((m) => m.id);
    const options = getRandomMenuOptions(SELECTION_OPTIONS_COUNT, excludeIds);
    set({ currentOptions: options, isSelectionOpen: true });
  },

  closeSelection: () => set({ isSelectionOpen: false }),

  selectMenu: (menuId: string) => {
    const { currentOptions, registeredMenus, maxMenuSlots } = get();
    const selectedMenu = currentOptions.find((m) => m.id === menuId);

    if (!selectedMenu) return;
    if (registeredMenus.length >= maxMenuSlots) return;

    set({
      registeredMenus: [...registeredMenus, selectedMenu],
      isSelectionOpen: false,
    });
  },

  refreshOptions: () => {
    const { registeredMenus } = get();
    const excludeIds = registeredMenus.map((m) => m.id);
    const options = getRandomMenuOptions(SELECTION_OPTIONS_COUNT, excludeIds);
    set({ currentOptions: options });
  },

  startGame: () => {
    set({ gameStarted: true, isSelectionOpen: false });
    // ゲーム開始時に一時停止を解除
    useRestaurantStore.setState({ isPaused: false });
  },

  reset: () => {
    const options = getRandomMenuOptions(SELECTION_OPTIONS_COUNT, []);
    set({
      registeredMenus: [],
      maxMenuSlots: INITIAL_MENU_SLOTS,
      currentOptions: options,
      isSelectionOpen: false,
      gameStarted: false,
    });
  },
}));

// 初期化時に選択肢を生成
useMenuStore.getState().refreshOptions();
