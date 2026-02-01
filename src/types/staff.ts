import type { Entity } from './entity';

export type StaffState =
  | 'idle' // 待機中
  | 'moving_to_kitchen' // キッチンへ移動
  | 'picking_food' // 料理を受け取り中
  | 'moving_to_customer' // お客さんへ移動
  | 'serving'; // 料理を渡し中

export interface Staff extends Entity {
  state: StaffState;
  carryingFoodId: string | null; // 持っている料理（null=手ぶら）
  targetCustomerId: string | null; // 配達先のお客さんID
}
