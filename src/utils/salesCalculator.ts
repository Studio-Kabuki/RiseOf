import type { MenuItem } from '../types';

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

  switch (ability) {
    case 'none':
      // 固定金額
      return value;

    case 'pizza_synergy': {
      // ピザシナジー: (ベース + 増加係数 * 他のピザ数) * 個数
      // 他のピザ数 = 同カテゴリのメニュー数 - 1（自分自身を除く）
      const pizzaCount = countMenusByCategory(registeredMenus, category);
      const otherPizzaCount = Math.max(0, pizzaCount - 1);
      return value + multiplier * otherPizzaCount;
    }

    case 'per_customer': {
      // 顧客数ボーナス: value + (今日の提供人数 - 1) * perCustomer
      const bonusCustomers = Math.max(0, todayCustomerCount - 1);
      return value + bonusCustomers * perCustomer;
    }

    case 'lit_chance':
      // LIT獲得能力の場合も固定金額
      return value;

    default:
      // 不明な能力の場合はvalueを返す
      return value;
  }
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

  return totalGold;
}
