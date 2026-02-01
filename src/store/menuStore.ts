import { create } from 'zustand';
import type { MenuItem } from '../types';
import { useRestaurantStore } from './restaurantStore';
import { MAX_MENU_SLOTS } from '../constants/game';

interface MenuState {
  // 現在登録されているメニュー
  registeredMenus: MenuItem[];
  // 最大登録数
  maxMenuSlots: number;
  // ゲームが開始されたか（タイトル画面から遷移したか）
  gameStarted: boolean;

  // Actions
  addMenu: (menu: MenuItem) => void;
  startGame: () => void;
  reset: () => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  registeredMenus: [],
  maxMenuSlots: MAX_MENU_SLOTS,
  gameStarted: false,

  addMenu: (menu: MenuItem) => {
    const { registeredMenus, maxMenuSlots } = get();
    if (registeredMenus.length >= maxMenuSlots) return;
    // 既に登録済みのメニューは追加しない
    if (registeredMenus.some((m) => m.id === menu.id)) return;
    set({ registeredMenus: [...registeredMenus, menu] });
  },

  startGame: () => {
    set({ gameStarted: true });
    // ゲーム開始時に一時停止を解除
    useRestaurantStore.setState({ isPaused: false });
  },

  reset: () => {
    set({
      registeredMenus: [],
      maxMenuSlots: MAX_MENU_SLOTS,
      gameStarted: false,
    });
  },
}));
