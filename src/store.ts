import { create } from 'zustand';
import type { Resources, Shop, SlotItem, FacilityDef, StaffDef, StaffSlot } from './types';
import { getInitialShops, getFacility, getStaff, rollGacha, rollStaffGacha, GACHA_COST, getShopUnlockConditions } from './data';

const REMOVE_COST = 1;
const NORMA_INTERVAL = 5; // 5日ごと
const BASE_NORMA = 100;   // 最初のノルマ

type GachaState = {
  isOpen: boolean;
  targetShopId: string | null;
  targetSlotIndex: number | null;
  choices: FacilityDef[];
};

type StaffGachaState = {
  isOpen: boolean;
  choices: StaffDef[];
};

type StaffPlacementState = {
  isOpen: boolean;
  targetShopId: string | null;
};

type GameState = {
  day: number;
  resources: Resources;
  shops: Shop[];
  selectedShopId: string | null;
  gacha: GachaState;
  staffGacha: StaffGachaState;
  staffPlacement: StaffPlacementState;
  staffInventory: string[];  // インベントリ内の人材ID
  gachaPurchasesThisTurn: number;
  isGameOver: boolean;
  normaCount: number;
  pendingStaffGacha: boolean;

  // アクション
  selectShop: (shopId: string | null) => void;
  buyShop: (shopId: string) => void;
  openGacha: (shopId: string, slotIndex: number) => void;
  closeGacha: () => void;
  selectGachaChoice: (facilityId: string) => void;
  removeSlot: (shopId: string, slotIndex: number) => void;
  closeStaffGacha: () => void;
  selectStaffGachaChoice: (staffId: string) => void;
  openStaffPlacement: (shopId: string) => void;
  closeStaffPlacement: () => void;
  placeStaff: (staffId: string) => void;
  removeStaff: (shopId: string) => void;
  endTurn: () => void;
  canAfford: (cost: Partial<Resources>) => boolean;
  getCurrentGachaCost: () => number;
  getNextNorma: () => number;
  getDaysUntilNorma: () => number;
  resetGame: () => void;
  initializeFromCSV: () => void;
};

const createInitialState = () => ({
  day: 1,
  resources: {
    money: 200,
    lit: 10,
  },
  shops: getInitialShops(),
  selectedShopId: null,
  gacha: {
    isOpen: false,
    targetShopId: null,
    targetSlotIndex: null,
    choices: [] as FacilityDef[],
  },
  staffGacha: {
    isOpen: false,
    choices: [] as StaffDef[],
  },
  staffPlacement: {
    isOpen: false,
    targetShopId: null,
  },
  staffInventory: [] as string[],
  gachaPurchasesThisTurn: 0,
  isGameOver: false,
  normaCount: 0,
  pendingStaffGacha: false,
});

// 店舗の収益を計算（人材効果を適用）
function calculateShopIncome(shop: Shop): { money: number; lit: number } {
  let totalMoney = 0;
  let totalLit = 0;

  // 人材情報を取得
  const staffDef = shop.staff ? getStaff(shop.staff.staffId) : null;

  // 各スロットの収益を計算
  for (const slot of shop.slots) {
    if (!slot) continue;

    const facility = getFacility(slot.facilityId);
    if (!facility) continue;

    let slotMoney = facility.income.money ?? 0;
    let slotLit = facility.income.lit ?? 0;

    // 人材効果を適用
    if (staffDef) {
      switch (staffDef.effectType) {
        case 'attribute_money_mult':
          if (staffDef.targetAttribute && facility.attribute === staffDef.targetAttribute) {
            slotMoney = Math.floor(slotMoney * staffDef.effectValue);
          }
          break;
        case 'attribute_lit_mult':
          if (staffDef.targetAttribute && facility.attribute === staffDef.targetAttribute) {
            slotLit = Math.floor(slotLit * staffDef.effectValue);
          }
          break;
      }
    }

    totalMoney += slotMoney;
    totalLit += slotLit;
  }

  // 店舗全体への倍率を適用
  if (staffDef) {
    switch (staffDef.effectType) {
      case 'shop_money_mult':
        totalMoney = Math.floor(totalMoney * staffDef.effectValue);
        break;
      case 'shop_lit_mult':
        totalLit = Math.floor(totalLit * staffDef.effectValue);
        break;
    }
  }

  return { money: totalMoney, lit: totalLit };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  initializeFromCSV: () => {
    set(createInitialState());
  },

  selectShop: (shopId) => set({ selectedShopId: shopId }),

  canAfford: (cost) => {
    const { resources } = get();
    return (
      (cost.money ?? 0) <= resources.money &&
      (cost.lit ?? 0) <= resources.lit
    );
  },

  getCurrentGachaCost: () => {
    const { gachaPurchasesThisTurn } = get();
    return GACHA_COST * Math.pow(2, gachaPurchasesThisTurn);
  },

  getNextNorma: () => {
    const { normaCount } = get();
    return BASE_NORMA + (normaCount * 50);
  },

  getDaysUntilNorma: () => {
    const { day } = get();
    return NORMA_INTERVAL - ((day - 1) % NORMA_INTERVAL);
  },

  buyShop: (shopId) => {
    const state = get();
    const shop = state.shops.find(s => s.id === shopId);
    if (!shop || shop.status !== 'vacant') return;
    if (!state.canAfford({ money: shop.unlockCost })) return;

    set((state) => ({
      resources: {
        ...state.resources,
        money: state.resources.money - shop.unlockCost,
      },
      shops: state.shops.map(s =>
        s.id === shopId ? { ...s, status: 'owned' as const } : s
      ),
    }));
  },

  openGacha: (shopId, slotIndex) => {
    const state = get();
    const cost = state.getCurrentGachaCost();
    if (!state.canAfford({ lit: cost })) return;

    set((state) => ({
      resources: {
        ...state.resources,
        lit: state.resources.lit - cost,
      },
      gacha: {
        isOpen: true,
        targetShopId: shopId,
        targetSlotIndex: slotIndex,
        choices: rollGacha(),
      },
    }));
  },

  closeGacha: () => {
    set({
      gacha: {
        isOpen: false,
        targetShopId: null,
        targetSlotIndex: null,
        choices: [],
      },
    });
  },

  selectGachaChoice: (facilityId) => {
    const state = get();
    const { targetShopId, targetSlotIndex } = state.gacha;
    if (!targetShopId || targetSlotIndex === null) return;

    const item: SlotItem = { facilityId };

    set((state) => ({
      shops: state.shops.map(s =>
        s.id === targetShopId
          ? {
              ...s,
              slots: s.slots.map((slot, i) =>
                i === targetSlotIndex ? item : slot
              ),
            }
          : s
      ),
      gacha: {
        isOpen: false,
        targetShopId: null,
        targetSlotIndex: null,
        choices: [],
      },
      gachaPurchasesThisTurn: state.gachaPurchasesThisTurn + 1,
    }));
  },

  removeSlot: (shopId, slotIndex) => {
    const state = get();
    if (!state.canAfford({ lit: REMOVE_COST })) return;

    const shop = state.shops.find(s => s.id === shopId);
    if (!shop || shop.status !== 'owned') return;
    if (shop.slots[slotIndex] === null) return;

    set((state) => ({
      resources: {
        ...state.resources,
        lit: state.resources.lit - REMOVE_COST,
      },
      shops: state.shops.map(s =>
        s.id === shopId
          ? {
              ...s,
              slots: s.slots.map((slot, i) =>
                i === slotIndex ? null : slot
              ),
            }
          : s
      ),
    }));
  },

  // 人材ガチャを閉じる（スキップ）
  closeStaffGacha: () => {
    set({
      staffGacha: {
        isOpen: false,
        choices: [],
      },
      pendingStaffGacha: false,
    });
  },

  // 人材ガチャで選択 → インベントリに追加
  selectStaffGachaChoice: (staffId) => {
    set((state) => ({
      staffInventory: [...state.staffInventory, staffId],
      staffGacha: {
        isOpen: false,
        choices: [],
      },
      pendingStaffGacha: false,
    }));
  },

  // 人材配置モーダルを開く
  openStaffPlacement: (shopId) => {
    const state = get();
    if (state.staffInventory.length === 0) return;

    const shop = state.shops.find(s => s.id === shopId);
    if (!shop || shop.status !== 'owned') return;

    set({
      staffPlacement: {
        isOpen: true,
        targetShopId: shopId,
      },
    });
  },

  // 人材配置モーダルを閉じる
  closeStaffPlacement: () => {
    set({
      staffPlacement: {
        isOpen: false,
        targetShopId: null,
      },
    });
  },

  // インベントリから人材を配置
  placeStaff: (staffId) => {
    const state = get();
    const { targetShopId } = state.staffPlacement;
    if (!targetShopId) return;

    // インベントリに存在するか確認
    const staffIndex = state.staffInventory.indexOf(staffId);
    if (staffIndex === -1) return;

    const staffSlot: StaffSlot = { staffId };

    // 既存の人材がいる場合はインベントリに戻す
    const shop = state.shops.find(s => s.id === targetShopId);
    const existingStaffId = shop?.staff?.staffId;

    set((state) => {
      const newInventory = [...state.staffInventory];
      // 選んだ人材をインベントリから削除
      newInventory.splice(staffIndex, 1);
      // 既存の人材がいればインベントリに戻す
      if (existingStaffId) {
        newInventory.push(existingStaffId);
      }

      return {
        staffInventory: newInventory,
        shops: state.shops.map(s =>
          s.id === targetShopId
            ? { ...s, staff: staffSlot }
            : s
        ),
        staffPlacement: {
          isOpen: false,
          targetShopId: null,
        },
      };
    });
  },

  // 人材を解除（インベントリに戻す）
  removeStaff: (shopId) => {
    const shop = get().shops.find(s => s.id === shopId);
    if (!shop || shop.status !== 'owned') return;
    if (shop.staff === null) return;

    const staffId = shop.staff.staffId;

    set((state) => ({
      staffInventory: [...state.staffInventory, staffId],
      shops: state.shops.map(s =>
        s.id === shopId
          ? { ...s, staff: null }
          : s
      ),
    }));
  },

  endTurn: () => {
    const state = get();
    if (state.isGameOver) return;

    set((state) => {
      let newMoney = state.resources.money;
      let newLit = state.resources.lit;
      let newNormaCount = state.normaCount;
      let newPendingStaffGacha = false;
      let newStaffGacha = state.staffGacha;
      const newDay = state.day + 1;

      // 各店舗の収益を計算（人材効果込み）
      for (const shop of state.shops) {
        if (shop.status !== 'owned') continue;

        const income = calculateShopIncome(shop);
        newMoney += income.money;
        newLit += income.lit;
      }

      // 5日ごとにノルマチェック
      if (newDay > 1 && (newDay - 1) % NORMA_INTERVAL === 0) {
        const norma = BASE_NORMA + (newNormaCount * 50);
        if (newMoney >= norma) {
          // ノルマ達成！人材ガチャを開く
          newMoney -= norma;
          newNormaCount += 1;
          newPendingStaffGacha = true;
          newStaffGacha = {
            isOpen: true,
            choices: rollStaffGacha(),
          };
        } else {
          newMoney -= norma;
          newNormaCount += 1;
        }
      }

      // ゲームオーバーチェック
      if (newMoney < 0) {
        return {
          ...state,
          day: newDay,
          resources: { money: newMoney, lit: newLit },
          isGameOver: true,
          gachaPurchasesThisTurn: 0,
        };
      }

      // アンロック条件チェック
      const unlockConditions = getShopUnlockConditions();
      const newShops = state.shops.map(s => {
        if (s.status === 'locked') {
          const condition = unlockConditions[s.id];
          if (condition) {
            let shouldUnlock = false;
            switch (condition.type) {
              case 'lit':
                shouldUnlock = newLit >= condition.value;
                break;
              case 'money':
                shouldUnlock = newMoney >= condition.value;
                break;
              case 'day':
                shouldUnlock = newDay >= condition.value;
                break;
            }
            if (shouldUnlock) {
              return { ...s, status: 'vacant' as const };
            }
          }
        }
        return s;
      });

      return {
        day: newDay,
        resources: { money: newMoney, lit: newLit },
        shops: newShops,
        gachaPurchasesThisTurn: 0,
        normaCount: newNormaCount,
        pendingStaffGacha: newPendingStaffGacha,
        staffGacha: newStaffGacha,
      };
    });
  },

  resetGame: () => {
    set(createInitialState());
  },
}));

export const REMOVE_SLOT_COST = REMOVE_COST;
export const NORMA_INTERVAL_DAYS = NORMA_INTERVAL;
