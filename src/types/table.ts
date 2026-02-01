import type { Position } from './entity';

export interface Seat {
  id: string;
  localPosition: Position; // テーブル基準の相対位置
  customerId: string | null; // 座っているお客さんID
}

export interface Table {
  id: string;
  position: Position; // テーブルの中心座標
  seats: Seat[]; // 座席（4つ）
}
