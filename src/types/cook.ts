import type { Entity } from './entity';
import type { Food } from './food';

/**
 * キッチンスタッフ（コック）の状態
 */
export type CookState =
  | 'idle' // 待機中
  | 'cooking'; // 調理中

/**
 * キッチンスタッフ（コック）
 */
export interface Cook extends Entity {
  state: CookState;
  currentOrderId: string | null; // 現在調理中の注文ID
  currentFood: Food | null; // 現在調理中の料理
  cookingProgress: number; // 調理進捗 (0-1)
}
