import type { GameSystem } from '../GameEngine';
import type { Cook } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useEntityStore } from '../../store/entityStore';

/**
 * キッチンシステム
 * コックが1人につき1つずつ料理を調理する
 */
export class KitchenSystem implements GameSystem {
  update(deltaTime: number): void {
    const { cooks, updateCook } = useEntityStore.getState();
    const { updateOrder, addReadyFood } =
      useRestaurantStore.getState();

    // 各コックの状態を処理
    for (const cook of cooks) {
      switch (cook.state) {
        case 'idle':
          this.handleIdleCook(cook, updateCook);
          break;

        case 'cooking':
          this.handleCookingCook(cook, deltaTime, updateCook, updateOrder, addReadyFood);
          break;
      }
    }
  }

  /**
   * 待機中のコックの処理
   * pending状態の注文があれば調理を開始
   */
  private handleIdleCook(
    cook: Cook,
    updateCook: (id: string, updates: Partial<Cook>) => void
  ): void {
    const { restaurant, updateOrder } = useRestaurantStore.getState();

    // pending状態の注文を探す
    const pendingOrder = restaurant.kitchen.orders.find(
      (order) => order.state === 'pending'
    );

    if (pendingOrder) {
      // 注文を調理中状態に変更
      updateOrder(pendingOrder.id, { state: 'cooking' });

      // コックが調理を開始
      updateCook(cook.id, {
        state: 'cooking',
        currentOrderId: pendingOrder.id,
        currentFood: pendingOrder.food,
        cookingProgress: 0,
      });
    }
  }

  /**
   * 調理中のコックの処理
   * 進捗を更新し、完了したら料理を配置
   */
  private handleCookingCook(
    cook: Cook,
    deltaTime: number,
    updateCook: (id: string, updates: Partial<Cook>) => void,
    updateOrder: (id: string, updates: Partial<import('../../types').Order>) => void,
    addReadyFood: (orderId: string) => void
  ): void {
    if (!cook.currentOrderId || !cook.currentFood) {
      // 調理中だが注文がない場合はidleに戻す
      updateCook(cook.id, {
        state: 'idle',
        currentOrderId: null,
        currentFood: null,
        cookingProgress: 0,
      });
      return;
    }

    // 調理時間を取得（料理のcookingTimeを使用、デフォルト3秒）
    const cookingTime = cook.currentFood.cookingTime || 3;
    const newProgress = cook.cookingProgress + deltaTime / cookingTime;

    if (newProgress >= 1) {
      // 調理完了
      updateOrder(cook.currentOrderId, {
        state: 'ready',
        cookingProgress: 1,
      });
      addReadyFood(cook.currentOrderId);

      // コックをidleに戻す
      updateCook(cook.id, {
        state: 'idle',
        currentOrderId: null,
        currentFood: null,
        cookingProgress: 0,
      });
    } else {
      // 進捗を更新
      updateCook(cook.id, { cookingProgress: newProgress });
      updateOrder(cook.currentOrderId, { cookingProgress: newProgress });
    }
  }
}
