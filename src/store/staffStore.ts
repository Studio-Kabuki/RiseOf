import { create } from 'zustand';
import type { StaffDefinition } from '../types/staffDefinition';
import { useEntityStore } from './entityStore';

const MAX_STAFF_SLOTS = 4;

// セット割引/フルコースボーナスの定義
export interface CategoryCountBonus {
  requiredCategories: number; // 必要なカテゴリ数
  value: number; // 加算される金額
}

interface StaffStoreState {
  // 雇用済み店員（最大4）
  hiredStaff: StaffDefinition[];
  // 最大スロット数
  maxStaffSlots: number;

  // 計算済み能力値（キャッシュ）
  cookingSpeedMultiplier: number; // 調理時間 × この値（0.5なら半分）
  customerSpeedMultiplier: number; // 来店間隔 ÷ この値（1.3なら30%速く）
  categoryBonuses: Record<string, number>; // カテゴリ別売上倍率
  baseBonuses: Record<string, number>; // カテゴリ別ベース加算額（円）
  categoryCountBonuses: CategoryCountBonus[]; // カテゴリ数ボーナス（set_bonus, full_course）

  // Actions
  hireStaff: (staff: StaffDefinition) => boolean;
  fireStaff: (staffId: string) => void;
  replaceStaff: (oldId: string, newStaff: StaffDefinition) => void;
  reorderStaff: (fromIndex: number, toIndex: number) => void; // 順番入れ替え
  recalculateAbilities: () => void;
  increaseMaxSlots: () => void; // 店員枠を1増やす
  reset: () => void;
}

// 能力値を再計算する関数
function calculateAbilities(hiredStaff: StaffDefinition[]) {
  // 調理時間: 各店員のcooking_speedを掛け合わせる
  const cookingSpeedMultiplier = hiredStaff
    .filter((s) => s.ability === 'cooking_speed')
    .reduce((acc, s) => {
      const value = typeof s.params.value === 'number' ? s.params.value : 1;
      return acc * value;
    }, 1.0);

  // 来店スピード: 各店員のcustomer_speedを掛け合わせる
  const customerSpeedMultiplier = hiredStaff
    .filter((s) => s.ability === 'customer_speed')
    .reduce((acc, s) => {
      const value = typeof s.params.value === 'number' ? s.params.value : 1;
      return acc * value;
    }, 1.0);

  // カテゴリボーナス: 同カテゴリは加算
  const categoryBonuses: Record<string, number> = {};
  hiredStaff
    .filter((s) => s.ability === 'category_bonus')
    .forEach((s) => {
      const cat = String(s.params.category || '');
      const multiplier =
        typeof s.params.multiplier === 'number' ? s.params.multiplier : 1;
      if (cat) {
        categoryBonuses[cat] = (categoryBonuses[cat] || 1.0) + (multiplier - 1);
      }
    });

  // ベースボーナス: 同カテゴリは加算（フラット加算、円単位）
  const baseBonuses: Record<string, number> = {};
  hiredStaff
    .filter((s) => s.ability === 'base_bonus')
    .forEach((s) => {
      const cat = String(s.params.category || '');
      const value = typeof s.params.value === 'number' ? s.params.value : 0;
      if (cat) {
        baseBonuses[cat] = (baseBonuses[cat] || 0) + value;
      }
    });

  // カテゴリ数ボーナス（set_bonus, full_course）
  const categoryCountBonuses: CategoryCountBonus[] = [];
  hiredStaff
    .filter((s) => s.ability === 'set_bonus' || s.ability === 'full_course')
    .forEach((s) => {
      const requiredCategories =
        typeof s.params.requiredCategories === 'number'
          ? s.params.requiredCategories
          : s.ability === 'full_course'
            ? 3
            : 2;
      const value = typeof s.params.value === 'number' ? s.params.value : 0;
      categoryCountBonuses.push({ requiredCategories, value });
    });

  return {
    cookingSpeedMultiplier,
    customerSpeedMultiplier,
    categoryBonuses,
    baseBonuses,
    categoryCountBonuses,
  };
}

export const useStaffStore = create<StaffStoreState>((set, get) => ({
  hiredStaff: [],
  maxStaffSlots: MAX_STAFF_SLOTS,

  cookingSpeedMultiplier: 1.0,
  customerSpeedMultiplier: 1.0,
  categoryBonuses: {},
  baseBonuses: {},
  categoryCountBonuses: [],

  hireStaff: (staff: StaffDefinition) => {
    const { hiredStaff, maxStaffSlots } = get();
    if (hiredStaff.length >= maxStaffSlots) return false;
    // 既に雇用済みなら追加しない
    if (hiredStaff.some((s) => s.id === staff.id)) return false;

    const newHiredStaff = [...hiredStaff, staff];
    const abilities = calculateAbilities(newHiredStaff);

    set({
      hiredStaff: newHiredStaff,
      ...abilities,
    });

    // ゲーム内のスタッフエンティティも追加
    useEntityStore.getState().setStaffCount(newHiredStaff.length);

    return true;
  },

  fireStaff: (staffId: string) => {
    const { hiredStaff } = get();
    const newHiredStaff = hiredStaff.filter((s) => s.id !== staffId);
    const abilities = calculateAbilities(newHiredStaff);

    set({
      hiredStaff: newHiredStaff,
      ...abilities,
    });

    // ゲーム内のスタッフエンティティも削除
    useEntityStore.getState().setStaffCount(newHiredStaff.length);
  },

  replaceStaff: (oldId: string, newStaff: StaffDefinition) => {
    const { hiredStaff } = get();
    const newHiredStaff = hiredStaff
      .filter((s) => s.id !== oldId)
      .concat(newStaff);
    const abilities = calculateAbilities(newHiredStaff);

    set({
      hiredStaff: newHiredStaff,
      ...abilities,
    });
  },

  reorderStaff: (fromIndex: number, toIndex: number) => {
    const { hiredStaff } = get();
    if (fromIndex < 0 || fromIndex >= hiredStaff.length) return;
    if (toIndex < 0 || toIndex >= hiredStaff.length) return;

    const newStaff = [...hiredStaff];
    const [moved] = newStaff.splice(fromIndex, 1);
    newStaff.splice(toIndex, 0, moved);
    set({ hiredStaff: newStaff });
  },

  recalculateAbilities: () => {
    const { hiredStaff } = get();
    const abilities = calculateAbilities(hiredStaff);
    set(abilities);
  },

  increaseMaxSlots: () => {
    set((state) => ({ maxStaffSlots: state.maxStaffSlots + 1 }));
  },

  reset: () => {
    set({
      hiredStaff: [],
      maxStaffSlots: MAX_STAFF_SLOTS,
      cookingSpeedMultiplier: 1.0,
      customerSpeedMultiplier: 1.0,
      categoryBonuses: {},
      baseBonuses: {},
      categoryCountBonuses: [],
    });
  },
}));
