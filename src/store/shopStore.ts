import { create } from 'zustand';
import type { StaffDefinition } from '../types/staffDefinition';
import { getRandomStaffOptions } from '../data/staffPool';
import { useStaffStore } from './staffStore';
import { useRestaurantStore } from './restaurantStore';
import { SHOP_LINEUP_SIZE } from '../constants/game';
// リロール費用（LIT）
const REROLL_COST_LIT = 1;

interface ShopState {
  // ショップに並んでいる店員（5人）
  lineup: StaffDefinition[];
  // ショップウィンドウが開いているか
  isOpen: boolean;
  // 今回のラインナップで売り切れた店員ID
  soldOutIds: string[];
  // 入れ替えモード（枠がいっぱいの場合）
  isReplaceMode: boolean;
  // 入れ替え対象の店員ID
  replaceTargetId: string | null;
  // 購入予定の店員（入れ替えモード用）
  pendingPurchaseId: string | null;

  // Actions
  openShop: () => void;
  closeShop: () => void;
  refreshLineup: () => void;
  reroll: () => boolean; // ラインナップを更新（LITを消費）
  purchaseStaff: (staffId: string) => boolean; // 店員を購入
  confirmReplace: (oldStaffId: string) => boolean; // 入れ替えを確定
  cancelReplace: () => void; // 入れ替えをキャンセル
  isSoldOut: (staffId: string) => boolean; // 店員が売り切れかどうか
  getRerollCost: () => number; // リロール費用を取得
  reset: () => void;
}

export const useShopStore = create<ShopState>((set, get) => ({
  lineup: [],
  isOpen: false,
  soldOutIds: [],
  isReplaceMode: false,
  replaceTargetId: null,
  pendingPurchaseId: null,

  openShop: () => {
    const { lineup } = get();
    // ラインナップが空なら初期化
    if (lineup.length === 0) {
      const { hiredStaff } = useStaffStore.getState();
      const excludeIds = hiredStaff.map((s) => s.id);
      const newLineup = getRandomStaffOptions(SHOP_LINEUP_SIZE, excludeIds);
      set({
        lineup: newLineup,
        isOpen: true,
        soldOutIds: [],
        isReplaceMode: false,
        replaceTargetId: null,
        pendingPurchaseId: null,
      });
    } else {
      set({ isOpen: true });
    }
  },

  closeShop: () =>
    set({
      isOpen: false,
      isReplaceMode: false,
      replaceTargetId: null,
      pendingPurchaseId: null,
    }),

  refreshLineup: () => {
    const { hiredStaff } = useStaffStore.getState();
    const excludeIds = hiredStaff.map((s) => s.id);
    const newLineup = getRandomStaffOptions(SHOP_LINEUP_SIZE, excludeIds);
    set({
      lineup: newLineup,
      soldOutIds: [],
      isReplaceMode: false,
      replaceTargetId: null,
      pendingPurchaseId: null,
    });
  },

  reroll: () => {
    // LITチェック
    const { lit } = useRestaurantStore.getState();
    if (lit < REROLL_COST_LIT) {
      return false;
    }

    // LITを消費
    useRestaurantStore.getState().spendLit(REROLL_COST_LIT);

    // ラインナップを更新（雇用済み店員を除外）
    const { hiredStaff } = useStaffStore.getState();
    const excludeIds = hiredStaff.map((s) => s.id);
    const newLineup = getRandomStaffOptions(SHOP_LINEUP_SIZE, excludeIds);

    set({
      lineup: newLineup,
      soldOutIds: [],
      isReplaceMode: false,
      replaceTargetId: null,
      pendingPurchaseId: null,
    });

    return true;
  },

  getRerollCost: () => REROLL_COST_LIT,

  purchaseStaff: (staffId: string) => {
    const { lineup, soldOutIds } = get();
    const staff = lineup.find((s) => s.id === staffId);
    if (!staff) return false;

    // 既に売り切れなら購入不可
    if (soldOutIds.includes(staffId)) return false;

    const { hiredStaff, maxStaffSlots } = useStaffStore.getState();
    const { lit } = useRestaurantStore.getState();

    // LIT不足なら購入不可
    if (lit < staff.cost) return false;

    // 既に雇用している店員は購入不可
    if (hiredStaff.some((s) => s.id === staffId)) return false;

    // 枠がいっぱいなら入れ替えモードに移行
    if (hiredStaff.length >= maxStaffSlots) {
      set({
        isReplaceMode: true,
        pendingPurchaseId: staffId,
      });
      return true; // 入れ替えモードに移行したことを示す
    }

    // LITを消費
    useRestaurantStore.getState().spendLit(staff.cost);

    // 店員を雇用
    useStaffStore.getState().hireStaff(staff);

    // 売り切れリストに追加
    set({
      soldOutIds: [...soldOutIds, staffId],
    });

    return true;
  },

  confirmReplace: (oldStaffId: string) => {
    const { lineup, soldOutIds, pendingPurchaseId } = get();
    if (!pendingPurchaseId) return false;

    const newStaff = lineup.find((s) => s.id === pendingPurchaseId);
    if (!newStaff) return false;

    const { lit } = useRestaurantStore.getState();

    // LIT不足なら購入不可
    if (lit < newStaff.cost) return false;

    // LITを消費
    useRestaurantStore.getState().spendLit(newStaff.cost);

    // 店員を入れ替え
    useStaffStore.getState().replaceStaff(oldStaffId, newStaff);

    // 売り切れリストに追加
    set({
      soldOutIds: [...soldOutIds, pendingPurchaseId],
      isReplaceMode: false,
      replaceTargetId: null,
      pendingPurchaseId: null,
    });

    return true;
  },

  cancelReplace: () => {
    set({
      isReplaceMode: false,
      replaceTargetId: null,
      pendingPurchaseId: null,
    });
  },

  isSoldOut: (staffId: string) => {
    const { soldOutIds } = get();
    return soldOutIds.includes(staffId);
  },

  reset: () => {
    set({
      lineup: [],
      isOpen: false,
      soldOutIds: [],
      isReplaceMode: false,
      replaceTargetId: null,
      pendingPurchaseId: null,
    });
  },
}));
