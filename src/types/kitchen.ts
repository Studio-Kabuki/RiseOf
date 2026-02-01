import type { Position } from './entity';
import type { Food } from './food';

export type OrderState = 'pending' | 'cooking' | 'ready';

export interface Order {
  id: string;
  customerId: string;
  food: Food; // 注文された料理
  state: OrderState;
  cookingProgress: number; // 0-1（調理進捗）
}

export interface Kitchen {
  position: Position; // キッチンの位置
  orders: Order[]; // 注文キュー
  readyFoods: string[]; // 完成した料理ID（Order.id）
}
