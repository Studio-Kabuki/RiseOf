import type { Entity } from './entity';

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
  orderedMenuId: string | null; // 注文したメニューID
  eatingProgress: number; // 0-1（食事進捗）
  payment: number; // 支払う金額
}
