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
 * 登録された全メニューの売上とLIT獲得を計算
 * abilityを削除したので、単純にpriceの合計を返す
 */
export function calculateSales(
  menus: MenuItem[],
  _context: SalesContext
): SalesResult {
  let totalGold = 0;

  for (const menu of menus) {
    totalGold += menu.price;
  }

  return {
    totalGold,
    earnedLit: 0, // LIT獲得はability削除により無効
  };
}

/**
 * 売上計算のプレビュー（確率要素を除く）
 * UIで価格表示に使用
 */
export function calculateSalesPreview(
  menus: MenuItem[],
  _context: SalesContext
): number {
  let totalGold = 0;

  for (const menu of menus) {
    totalGold += menu.price;
  }

  return totalGold;
}
