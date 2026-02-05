import type { StaffDefinition } from '../types/staffDefinition';
import { getShoppableStaffPool } from './staffLoader';

// プールからランダムにN個選ぶ（選択済みを除外、shopExclude=trueも除外）
export function getRandomStaffOptions(
  count: number,
  excludeIds: string[] = []
): StaffDefinition[] {
  // shopExclude=trueのスタッフを除外したプールから選ぶ
  const pool = getShoppableStaffPool();
  const available = pool.filter((s) => !excludeIds.includes(s.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 後方互換性のためのエクスポート
export { getStaffPool as STAFF_POOL } from './staffLoader';
