import { create } from 'zustand';
import type { MenuItem } from '../types';
import { getRandomMenuOptions } from '../data/menuPool';
import { useMenuStore } from './menuStore';
import { useRestaurantStore } from './restaurantStore';

// ショップに並ぶ商品数
const SHOP_LINEUP_COUNT = 5;
// リロール費用（所持金）
const REROLL_COST = 50;

interface ShopState {
  // ショップに並んでいるメニュー（5つ）
  lineup: MenuItem[];
  // ショップウィンドウが開いているか
  isOpen: boolean;
  // 今回のラインナップで売り切れたメニューID
  soldOutIds: string[];

  // Actions
  openShop: () => void;
  closeShop: () => void;
  refreshLineup: () => void;
  reroll: () => boolean; // ラインナップを更新（所持金を消費）
  purchaseMenu: (menuId: string) => boolean; // メニューを購入（LIT消費はShopWindow側で処理）
  isSoldOut: (menuId: string) => boolean; // メニューが売り切れかどうか
  getRerollCost: () => number; // リロール費用を取得
  reset: () => void;
}

export const useShopStore = create<ShopState>((set, get) => ({
  lineup: [],
  isOpen: false,
  soldOutIds: [],

  openShop: () => {
    const { lineup } = get();
    // ラインナップが空なら初期化
    if (lineup.length === 0) {
      const { registeredMenus } = useMenuStore.getState();
      const excludeIds = registeredMenus.map((m) => m.id);
      const newLineup = getRandomMenuOptions(SHOP_LINEUP_COUNT, excludeIds);
      set({ lineup: newLineup, isOpen: true, soldOutIds: [] });
    } else {
      set({ isOpen: true });
    }
  },

  closeShop: () => set({ isOpen: false }),

  refreshLineup: () => {
    const { registeredMenus } = useMenuStore.getState();
    const excludeIds = registeredMenus.map((m) => m.id);
    const newLineup = getRandomMenuOptions(SHOP_LINEUP_COUNT, excludeIds);
    set({ lineup: newLineup, soldOutIds: [] });
  },

  reroll: () => {
    // 所持金チェック
    const { money } = useRestaurantStore.getState();
    if (money < REROLL_COST) {
      return false;
    }

    // 所持金を消費
    useRestaurantStore.setState({ money: money - REROLL_COST });

    // ラインナップを更新（獲得済みメニューを除外）
    const { registeredMenus } = useMenuStore.getState();
    const excludeIds = registeredMenus.map((m) => m.id);
    const newLineup = getRandomMenuOptions(SHOP_LINEUP_COUNT, excludeIds);

    set({
      lineup: newLineup,
      soldOutIds: [],
    });

    return true;
  },

  getRerollCost: () => REROLL_COST,

  purchaseMenu: (menuId: string) => {
    const { lineup, soldOutIds } = get();
    const menu = lineup.find((m) => m.id === menuId);
    if (!menu) return false;

    // 既に売り切れなら購入不可
    if (soldOutIds.includes(menuId)) return false;

    const { registeredMenus, maxMenuSlots } = useMenuStore.getState();
    if (registeredMenus.length >= maxMenuSlots) return false;

    // 既に所持しているメニューは購入不可
    if (registeredMenus.some((m) => m.id === menuId)) return false;

    // メニューを登録
    useMenuStore.setState({
      registeredMenus: [...registeredMenus, menu],
    });

    // 売り切れリストに追加（ラインナップからは削除しない）
    set({
      soldOutIds: [...soldOutIds, menuId],
    });

    return true;
  },

  isSoldOut: (menuId: string) => {
    const { soldOutIds } = get();
    return soldOutIds.includes(menuId);
  },

  reset: () => {
    set({
      lineup: [],
      isOpen: false,
      soldOutIds: [],
    });
  },
}));
