import type { MenuItem } from '../types';
import { useEventStore } from '../store/eventStore';

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
 * メニューの価格にイベント効果を適用
 */
function applyEventEffects(menu: MenuItem): number {
  const eventStore = useEventStore.getState();

  // 基本価格
  let price = menu.price;

  // カテゴリボーナスを適用
  const priceBonus = eventStore.getPriceBonus(menu.category);
  price += priceBonus;

  // 売上倍率を適用（特定メニュー用）
  const salesMultiplier = eventStore.getSalesMultiplier(menu.id);
  price = Math.floor(price * salesMultiplier);

  return price;
}

/**
 * 登録された全メニューの売上とLIT獲得を計算
 * イベント効果を適用
 */
export function calculateSales(
  menus: MenuItem[],
  _context: SalesContext
): SalesResult {
  let totalGold = 0;

  for (const menu of menus) {
    totalGold += applyEventEffects(menu);
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
