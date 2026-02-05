import type { MenuItem } from '../types';
import { useEventStore } from '../store/eventStore';
import { useMenuStore } from '../store/menuStore';
import type { MenuCategory } from '../types/menu';

/**
 * 売上計算のコンテキスト情報
 */
export interface SalesContext {
  /** 登録されている全メニュー */
  registeredMenus: MenuItem[];
  /** 今日の提供人数（1から開始） */
  todayCustomerCount: number;
  /** お客さんの好みカテゴリ（好みに合致したメニューは2倍） */
  customerPreference?: MenuCategory;
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
 * シーズニング効果を適用した価格を計算
 */
function applySeasoningEffects(menu: MenuItem, basePrice: number): number {
  const menuStore = useMenuStore.getState();
  const appliedSeasoning = menuStore.getMenuSeasoning(menu.id);

  if (!appliedSeasoning) return basePrice;

  const seasoningDef = menuStore.getSeasoningDefinition(appliedSeasoning.seasoningId);
  if (!seasoningDef) return basePrice;

  let price = basePrice;

  switch (seasoningDef.effectType) {
    case 'sales_multiplier': {
      // 単純な売上倍率
      const multiplier = seasoningDef.params.multiplier || 1;
      price = Math.floor(price * multiplier);
      break;
    }
    case 'stacking_bonus': {
      // 購入ごとに加算
      const stackValue = seasoningDef.params.stackValue || 0;
      price += stackValue * appliedSeasoning.stackCount;
      break;
    }
    case 'category_bonus': {
      // カテゴリボーナス（特定カテゴリで追加効果）
      const multiplier = seasoningDef.params.multiplier || 1;
      const categoryBonus = seasoningDef.params.categoryBonus;

      if (categoryBonus && menu.category === categoryBonus.category) {
        // 対象カテゴリの場合、基本倍率 * 追加倍率
        price = Math.floor(price * multiplier * categoryBonus.extraMultiplier);
      } else {
        // 対象外カテゴリの場合、基本倍率のみ
        price = Math.floor(price * multiplier);
      }
      break;
    }
    case 'all_categories': {
      // 全カテゴリを持つ（イベント効果で別途処理）
      // 価格自体は変わらない
      break;
    }
  }

  return price;
}

/**
 * メニューが持つカテゴリを取得（all_categoriesシーズニング考慮）
 */
export function getMenuCategories(menu: MenuItem): MenuCategory[] {
  const menuStore = useMenuStore.getState();
  const appliedSeasoning = menuStore.getMenuSeasoning(menu.id);

  if (appliedSeasoning) {
    const seasoningDef = menuStore.getSeasoningDefinition(appliedSeasoning.seasoningId);
    if (seasoningDef?.effectType === 'all_categories') {
      return ['snack', 'main', 'dessert'];
    }
  }

  return [menu.category];
}

/**
 * メニューの価格にイベント効果を適用
 * @param menu メニュー
 * @param customerPreference お客さんの好みカテゴリ（省略可、指定時は好みに合致で2倍）
 */
function applyEventEffects(menu: MenuItem, customerPreference?: MenuCategory): number {
  const eventStore = useEventStore.getState();

  // 基本価格
  let price = menu.price;

  // メニューが持つカテゴリを取得（all_categoriesシーズニング考慮）
  const categories = getMenuCategories(menu);

  // カテゴリボーナスを適用（複数カテゴリの場合は最大値）
  let maxPriceBonus = 0;
  for (const category of categories) {
    const bonus = eventStore.getPriceBonus(category);
    if (bonus > maxPriceBonus) {
      maxPriceBonus = bonus;
    }
  }
  price += maxPriceBonus;

  // 売上倍率を適用（特定メニュー用）
  const salesMultiplier = eventStore.getSalesMultiplier(menu.id);
  price = Math.floor(price * salesMultiplier);

  // シーズニング効果を適用
  price = applySeasoningEffects(menu, price);

  // お客さんの好みボーナス（好みカテゴリに合致したら2倍）
  if (customerPreference && categories.includes(customerPreference)) {
    price = price * 2;
  }

  return price;
}

/**
 * 登録された全メニューの売上とLIT獲得を計算
 * イベント効果とお客さんの好みボーナスを適用
 */
export function calculateSales(
  menus: MenuItem[],
  context: SalesContext
): SalesResult {
  let totalGold = 0;

  for (const menu of menus) {
    totalGold += applyEventEffects(menu, context.customerPreference);
  }

  return {
    totalGold,
    earnedLit: 0, // LIT獲得はability削除により無効
  };
}

/**
 * 売上計算のプレビュー（確率要素を除く）
 * UIで価格表示に使用。イベント効果を適用
 */
export function calculateSalesPreview(
  menus: MenuItem[],
  _context: SalesContext
): number {
  let totalGold = 0;

  for (const menu of menus) {
    totalGold += applyEventEffects(menu);
  }

  return totalGold;
}
