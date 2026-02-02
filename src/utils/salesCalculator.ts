import type { MenuItem } from '../types';
import { useStaffStore } from '../store/staffStore';

/**
 * 売上計算のコンテキスト情報
 */
export interface SalesContext {
  /** 登録されている全メニュー */
  registeredMenus: MenuItem[];
  /** 今日の提供人数（1から開始） */
  todayCustomerCount: number;
}

/**
 * スタッフ能力ボーナスを取得
 */
function getStaffBonuses(): {
  categoryBonuses: Record<string, number>;
  baseBonuses: Record<string, number>;
  categoryCountBonuses: { requiredCategories: number; value: number }[];
} {
  const { categoryBonuses, baseBonuses, categoryCountBonuses } = useStaffStore.getState();
  return { categoryBonuses, baseBonuses, categoryCountBonuses };
}

/**
 * 登録メニューのユニークカテゴリ数を取得
 */
function getUniqueCategoryCount(menus: MenuItem[]): number {
  const categories = new Set<string>();
  for (const menu of menus) {
    const category = menu.params?.category;
    if (typeof category === 'string' && category) {
      categories.add(category);
    }
  }
  return categories.size;
}

/**
 * カテゴリ数ボーナスを計算（set_bonus, full_course）
 */
function calculateCategoryCountBonus(uniqueCategoryCount: number): number {
  const { categoryCountBonuses } = getStaffBonuses();
  let bonus = 0;
  for (const { requiredCategories, value } of categoryCountBonuses) {
    if (uniqueCategoryCount >= requiredCategories) {
      bonus += value;
    }
  }
  return bonus;
}

/**
 * 売上計算結果
 */
export interface SalesResult {
  /** 合計売上金額 */
  totalGold: number;
  /** 獲得LIT */
  earnedLit: number;
}

/**
 * 指定カテゴリのメニュー数をカウント
 */
function countMenusByCategory(menus: MenuItem[], category: string): number {
  return menus.filter((menu) => {
    // paramsからcategoryを取得
    const menuCategory = menu.params?.category;
    return menuCategory === category;
  }).length;
}

/**
 * 単一メニューの売上を計算
 * スタッフ能力ボーナスも適用
 */
function calculateMenuGold(menu: MenuItem, context: SalesContext): number {
  const { registeredMenus, todayCustomerCount } = context;
  const params = menu.params || {};
  const ability = menu.ability || 'none';

  // paramsから値を取得（数値として）
  const value = typeof params.value === 'number' ? params.value : 0;
  const multiplier = typeof params.multiplier === 'number' ? params.multiplier : 0;
  const perCustomer = typeof params.perCustomer === 'number' ? params.perCustomer : 0;
  const category = typeof params.category === 'string' ? params.category : '';

  // 基本売上を計算
  let baseGold = 0;

  switch (ability) {
    case 'none':
      // 固定金額
      baseGold = value;
      break;

    case 'pizza_synergy': {
      // ピザシナジー: (ベース + 増加係数 * 他のピザ数) * 個数
      // 他のピザ数 = 同カテゴリのメニュー数 - 1（自分自身を除く）
      const pizzaCount = countMenusByCategory(registeredMenus, category);
      const otherPizzaCount = Math.max(0, pizzaCount - 1);
      baseGold = value + multiplier * otherPizzaCount;
      break;
    }

    case 'per_customer': {
      // 顧客数ボーナス: value + (今日の提供人数 - 1) * perCustomer
      const bonusCustomers = Math.max(0, todayCustomerCount - 1);
      baseGold = value + bonusCustomers * perCustomer;
      break;
    }

    case 'lit_chance':
      // LIT獲得能力の場合も固定金額
      baseGold = value;
      break;

    case 'eating_time':
      // 食事時間変更能力の場合も固定金額（効果はCustomerSystemで適用）
      baseGold = value;
      break;

    default:
      // 不明な能力の場合はvalueを返す
      baseGold = value;
      break;
  }

  // スタッフ能力ボーナスを適用
  if (category) {
    const { categoryBonuses, baseBonuses } = getStaffBonuses();

    // ベースボーナス適用（フラット加算型: +50なら+50円）
    const baseBonusValue = baseBonuses[category] || 0;
    baseGold = baseGold + baseBonusValue;

    // カテゴリボーナス適用（乗算型: 1なら変化なし、1.25なら×1.25）
    const categoryMultiplier = categoryBonuses[category] || 1;

    baseGold = baseGold * categoryMultiplier;
  }

  return baseGold;
}

/**
 * LIT獲得を計算（確率判定）
 */
function calculateMenuLit(menu: MenuItem): number {
  const params = menu.params || {};
  const ability = menu.ability || 'none';

  if (ability !== 'lit_chance') {
    return 0;
  }

  const litChance = typeof params.litChance === 'number' ? params.litChance : 0;

  // 確率判定
  if (Math.random() < litChance) {
    return 1;
  }

  return 0;
}

/**
 * 登録された全メニューの売上とLIT獲得を計算
 */
export function calculateSales(
  menus: MenuItem[],
  context: SalesContext
): SalesResult {
  let totalGold = 0;
  let earnedLit = 0;

  for (const menu of menus) {
    totalGold += calculateMenuGold(menu, context);
    earnedLit += calculateMenuLit(menu);
  }

  // カテゴリ数ボーナスを適用（set_bonus, full_course）
  const uniqueCategoryCount = getUniqueCategoryCount(context.registeredMenus);
  totalGold += calculateCategoryCountBonus(uniqueCategoryCount);

  return {
    totalGold,
    earnedLit,
  };
}

/**
 * 売上計算のプレビュー（確率要素を除く）
 * UIで価格表示に使用
 */
export function calculateSalesPreview(
  menus: MenuItem[],
  context: SalesContext
): number {
  let totalGold = 0;

  for (const menu of menus) {
    totalGold += calculateMenuGold(menu, context);
  }

  // カテゴリ数ボーナスを適用（set_bonus, full_course）
  const uniqueCategoryCount = getUniqueCategoryCount(context.registeredMenus);
  totalGold += calculateCategoryCountBonus(uniqueCategoryCount);

  return totalGold;
}
