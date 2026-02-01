import type { GameSystem } from '../GameEngine';
import { useRestaurantStore } from '../../store/restaurantStore';

export class KitchenSystem implements GameSystem {
  update(deltaTime: number): void {
    const { restaurant, updateOrder, addReadyFood } =
      useRestaurantStore.getState();

    for (const order of restaurant.kitchen.orders) {
      switch (order.state) {
        case 'pending':
          // 調理開始
          updateOrder(order.id, { state: 'cooking' });
          break;

        case 'cooking':
          // 調理進行（料理の調理時間を使用）
          const cookingTime = order.food.cookingTime || 3; // デフォルト3秒
          const progress = order.cookingProgress + deltaTime / cookingTime;

          if (progress >= 1) {
            // 調理完了
            updateOrder(order.id, {
              state: 'ready',
              cookingProgress: 1,
            });
            addReadyFood(order.id);
          } else {
            updateOrder(order.id, { cookingProgress: progress });
          }
          break;

        case 'ready':
          // StaffSystemが処理
          break;
      }
    }
  }
}
