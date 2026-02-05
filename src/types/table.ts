import type { Position } from './entity';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Seat {
  id: string;
  localPosition: Position; // テーブル基準の相対位置
  customerId: string | null; // 座っているお客さんID
  direction?: Direction; // お客さんが向いている方向（配膳位置計算用）
  servingOffset?: number; // 配膳位置のオフセット（デフォルト1マス + この値）
}

export interface Table {
  id: string;
  position: Position; // テーブルの中心座標
  seats: Seat[]; // 座席
  index?: number; // 解放レベル（0から順に解放）
}
