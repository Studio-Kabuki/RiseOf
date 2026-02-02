import type { Entity } from './entity';
import type { Food } from './food';

/**
 * 統合スタッフのステートマシン
 * - 調理と配膳の両方を一人で担当できる
 * - 初期スタッフは1人（ワンオペ）
 */
export type StaffState =
  | 'idle' // 待機中
  | 'moving_to_kitchen' // 調理場へ移動中
  | 'cooking' // 調理中
  | 'picking_food' // 料理を取得中
  | 'moving_to_customer' // 客席へ移動中
  | 'serving'; // 配膳中

/**
 * 統合スタッフ
 * - 調理スタッフと配膳スタッフを統合
 * - 一人のスタッフが調理も配膳もできる
 */
export interface Staff extends Entity {
  state: StaffState;
  currentOrderId: string | null; // 現在処理中の注文ID
  currentFood: Food | null; // 調理中の料理
  cookingProgress: number; // 調理進捗 (0-1)
  carryingFood: Food | null; // 運んでいる料理（null=手ぶら）
  targetCustomerId: string | null; // 配膳対象の客ID
}
