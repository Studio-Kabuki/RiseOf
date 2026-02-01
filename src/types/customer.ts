import type { Entity } from './entity';
import type { Food } from './food';

export type CustomerState =
  | 'entering' // 入店中（入口から席へ移動）
  | 'seated' // 着席済み
  | 'ordering' // 注文中（吹き出し表示）
  | 'waiting' // 料理待ち
  | 'eating' // 食事中（10秒）
  | 'paying' // 支払い（お金を置く）
  | 'leaving'; // 退店中

export interface Customer extends Entity {
  state: CustomerState;
  assignedSeatId: string | null; // 割り当てられた座席ID
  orderedFood: Food | null; // 注文した料理
  eatingProgress: number; // 0-1（食事進捗）
}
