import type { Entity } from './entity';
import type { Food } from './food';

export type StaffState =
  | 'idle' // 待機中
  | 'moving_to_kitchen' // キッチンへ移動
  | 'picking_food' // 料理を受け取り中
  | 'moving_to_customer' // お客さんへ移動
  | 'serving'; // 料理を渡し中

export interface Staff extends Entity {
  state: StaffState;
  carryingFood: Food | null; // 持っている料理（null=手ぶら）
  targetCustomerId: string | null; // 配達先のお客さんID
  targetOrderId: string | null; // 対象の注文ID
}
