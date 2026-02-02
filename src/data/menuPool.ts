import type { MenuItem } from '../types';
import { getMenuPool } from './menuLoader';
import { ICONS } from '../constants/game';

// CSVから読み込んだメニュープールを取得
export function getMENU_POOL(): MenuItem[] {
  return getMenuPool();
}

// 後方互換性のため（CSVロード前のフォールバック）
export const MENU_POOL_FALLBACK: MenuItem[] = [
  {
    id: 'meal',
    name: 'おまかせ料理',
    price: 350,
    cookingTime: 3,
    iconUrl: ICONS.meal,
  },
];

// プールからランダムにN個選ぶ（選択済みを除外）
export function getRandomMenuOptions(
  count: number,
  excludeIds: string[] = []
): MenuItem[] {
  const pool = getMenuPool();
  const available = pool.filter((m) => !excludeIds.includes(m.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 後方互換性のためのエクスポート（CSVロード後に使う）
export { getMenuPool as MENU_POOL } from './menuLoader';
