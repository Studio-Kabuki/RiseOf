import type { Position } from './entity';

export type OrderState = 'pending' | 'cooking' | 'ready';

export interface Order {
  id: string;
  customerId: string;
  menuId: string; // ドリア固定（MVP）
  state: OrderState;
  cookingProgress: number; // 0-1（調理進捗）
}

export interface Kitchen {
  position: Position; // キッチンの位置
  orders: Order[]; // 注文キュー
  readyFoods: string[]; // 完成した料理ID（Order.id）
}
