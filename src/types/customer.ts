import type { Entity } from './entity';
import type { Food } from './food';
import type { Direction } from './table';
import type { MenuCategory } from './menu';

export type CustomerState =
  | 'waiting_outside' // 店外で待機中（満席時）
  | 'entering' // 入店中（入口から席へ移動）
  | 'seated' // 着席済み
  | 'waiting_for_menu' // メニューがない時の待機（?吹き出し表示）
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
  direction?: Direction; // お客さんが向いている方向（配膳位置計算用）
  servingOffset?: number; // 配膳位置のオフセット（デフォルト1マス + この値）
  preference: MenuCategory; // お客さんの好み（好みカテゴリで売上2倍）
}
