import type { GameSystem } from '../GameEngine';
import type { Staff, Position, Order } from '../../types';
import { useEntityStore } from '../../store/entityStore';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useStaffStore } from '../../store/staffStore';

/**
 * 統合スタッフシステム
 * スタッフが調理と配膳の両方を担当する
 *
 * ステートマシンのフロー:
 * idle -> moving_to_kitchen -> cooking -> picking_food -> moving_to_customer -> serving -> idle
 *
 * - idle: 待機中（定位置に戻る、新しい注文があればキッチンへ移動）
 * - moving_to_kitchen: キッチンへ移動中（調理または配膳のため）
 * - cooking: 調理中（進捗を更新、完了したらpicking_foodへ）
 * - picking_food: 料理を受け取り中
 * - moving_to_customer: お客さんへ移動中
 * - serving: 料理を渡し中
 */
export class StaffSystem implements GameSystem {
  // 現在のフレームで既に担当が決まった注文IDを追跡
  private claimedOrderIds: Set<string> = new Set();

  /**
   * 注文が他のスタッフに既に担当されているかチェック
   */
  private isOrderClaimed(orderId: string, allStaff: Staff[], currentStaffId: string): boolean {
    // 現在のフレームで既にclaimされている
    if (this.claimedOrderIds.has(orderId)) {
      return true;
    }
    // 他のスタッフが既にこの注文を担当している
    return allStaff.some(
      (s) => s.id !== currentStaffId && s.currentOrderId === orderId
    );
  }

  /**
   * 注文を担当としてマーク
   */
  private claimOrder(orderId: string): void {
    this.claimedOrderIds.add(orderId);
  }
  update(deltaTime: number): void {
    const { staff, updateStaff, customers, updateCustomer } =
      useEntityStore.getState();
    const { restaurant, removeReadyFood, removeOrder, isClosing, getStaffPosition } =
      useRestaurantStore.getState();

    // フレーム開始時にクリア
    this.claimedOrderIds.clear();

    for (let i = 0; i < staff.length; i++) {
      const s = staff[i];
      const idlePosition = getStaffPosition(i);

      // 閉店処理中：全員即座にidleにして定位置に戻す
      if (isClosing && s.state !== 'idle') {
        updateStaff(s.id, {
          state: 'idle',
          carryingFood: null,
          targetCustomerId: null,
          currentOrderId: null,
          cookingProgress: 0,
          currentFood: null,
        });
        continue;
      }

      switch (s.state) {
        case 'idle':
          this.handleIdle(s, i, idlePosition, restaurant.kitchen, deltaTime, updateStaff, staff);
          break;

        case 'moving_to_kitchen':
          this.handleMovingToKitchen(
            s,
            restaurant.kitchen.position,
            deltaTime,
            updateStaff
          );
          break;

        case 'cooking':
          this.handleCooking(s, deltaTime, updateStaff);
          break;

        case 'picking_food':
          this.handlePickingFood(s, removeReadyFood, updateStaff);
          break;

        case 'moving_to_customer':
          this.handleMovingToCustomer(
            s,
            customers,
            deltaTime,
            updateStaff
          );
          break;

        case 'serving':
          this.handleServing(
            s,
            i,
            customers,
            updateCustomer,
            removeOrder,
            updateStaff,
            staff
          );
          break;
      }
    }
  }

  /**
   * 待機中の処理
   * 優先順位:
   * 1. 完成した料理があればキッチンへ（配膳）
   * 2. 未調理の注文があればキッチンへ（調理）
   * 3. 何もなければ定位置で待機
   */
  private handleIdle(
    staff: Staff,
    _staffIndex: number,
    idlePosition: Position,
    kitchen: { readyFoods: string[]; orders: Order[]; position: Position },
    deltaTime: number,
    updateStaff: (id: string, updates: Partial<Staff>) => void,
    allStaff: Staff[]
  ): void {
    const { isClosing } = useRestaurantStore.getState();

    // まず定位置に戻る
    const dx = idlePosition.x - staff.position.x;
    const dy = idlePosition.y - staff.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 2) {
      // 定位置に移動中
      this.moveTowards(staff, idlePosition, deltaTime, updateStaff);
      return;
    }

    // 閉店処理中は新しい仕事を始めない
    if (isClosing) return;

    // 優先順位1: 完成した料理があれば配膳へ（他のスタッフが担当していないものを探す）
    for (const orderId of kitchen.readyFoods) {
      if (this.isOrderClaimed(orderId, allStaff, staff.id)) {
        continue; // 既に他のスタッフが担当している
      }

      const order = useRestaurantStore.getState().getOrder(orderId);
      if (order) {
        this.claimOrder(orderId);
        updateStaff(staff.id, {
          state: 'moving_to_kitchen',
          carryingFood: order.food,
          targetCustomerId: order.customerId,
          currentOrderId: orderId,
          cookingProgress: 0,
          currentFood: null,
        });
        return;
      }
    }

    // 優先順位2: 未調理の注文があれば調理へ（他のスタッフが担当していないものを探す）
    const pendingOrder = kitchen.orders.find(
      (order) => order.state === 'pending' && !this.isOrderClaimed(order.id, allStaff, staff.id)
    );

    if (pendingOrder) {
      // 注文を担当としてマーク
      this.claimOrder(pendingOrder.id);
      // 注文を調理中状態に変更
      useRestaurantStore.getState().updateOrder(pendingOrder.id, { state: 'cooking' });

      updateStaff(staff.id, {
        state: 'moving_to_kitchen',
        currentOrderId: pendingOrder.id,
        currentFood: pendingOrder.food,
        targetCustomerId: pendingOrder.customerId,
        cookingProgress: 0,
        carryingFood: null,
      });
    }
  }

  /**
   * キッチンへ移動中の処理
   * 店員の定位置 = キッチンとみなすので、移動は行わず即座に次のステートへ遷移
   * - currentFoodがある場合: 調理開始（cookingステートへ）
   * - carryingFoodがある場合: 配膳のため料理を受け取る（picking_foodステートへ）
   */
  private handleMovingToKitchen(
    staff: Staff,
    _kitchenPosition: Position,
    _deltaTime: number,
    updateStaff: (id: string, updates: Partial<Staff>) => void
  ): void {
    // 店員の定位置 = キッチンなので、移動は不要（即座に到着扱い）
    // currentFoodがある場合は調理開始
    if (staff.currentFood) {
      updateStaff(staff.id, { state: 'cooking' });
    } else {
      // carryingFoodがある場合は配膳のため料理を受け取る
      updateStaff(staff.id, { state: 'picking_food' });
    }
  }

  /**
   * 調理中の処理
   * 調理進捗を更新し、完了したら料理を完成状態にしてpicking_foodへ
   */
  private handleCooking(
    staff: Staff,
    deltaTime: number,
    updateStaff: (id: string, updates: Partial<Staff>) => void
  ): void {
    const { isClosing, updateOrder, addReadyFood } = useRestaurantStore.getState();

    // 閉店処理中は調理を止める
    if (isClosing) {
      updateStaff(staff.id, {
        state: 'idle',
        currentOrderId: null,
        currentFood: null,
        cookingProgress: 0,
        carryingFood: null,
        targetCustomerId: null,
      });
      return;
    }

    if (!staff.currentOrderId || !staff.currentFood) {
      // 調理中だが注文がない場合はidleに戻す
      updateStaff(staff.id, {
        state: 'idle',
        currentOrderId: null,
        currentFood: null,
        cookingProgress: 0,
        carryingFood: null,
        targetCustomerId: null,
      });
      return;
    }

    // 調理時間を取得（料理のcookingTimeを使用、デフォルト3秒）
    // 店員の能力による調理時間短縮を適用
    const { cookingSpeedMultiplier } = useStaffStore.getState();
    const baseCookingTime = staff.currentFood.cookingTime ?? 3;

    // 調理時間が0なら即座に完了
    if (baseCookingTime === 0) {
      // 調理完了
      updateOrder(staff.currentOrderId, {
        state: 'ready',
        cookingProgress: 1,
      });
      addReadyFood(staff.currentOrderId);

      // 料理を持って配膳へ
      updateStaff(staff.id, {
        state: 'picking_food',
        carryingFood: staff.currentFood,
        currentFood: null,
        cookingProgress: 0,
      });
      return;
    }

    const cookingTime = baseCookingTime * cookingSpeedMultiplier;
    const newProgress = staff.cookingProgress + deltaTime / cookingTime;

    if (newProgress >= 1) {
      // 調理完了
      updateOrder(staff.currentOrderId, {
        state: 'ready',
        cookingProgress: 1,
      });
      addReadyFood(staff.currentOrderId);

      // 料理を持って配膳へ（自分で作った料理を自分で運ぶ）
      updateStaff(staff.id, {
        state: 'picking_food',
        carryingFood: staff.currentFood,
        currentFood: null,
        cookingProgress: 0,
      });
    } else {
      // 進捗を更新
      updateStaff(staff.id, { cookingProgress: newProgress });
      updateOrder(staff.currentOrderId, { cookingProgress: newProgress });
    }
  }

  /**
   * 料理を受け取り中の処理
   * 料理を受け取ってお客さんへ移動開始
   */
  private handlePickingFood(
    staff: Staff,
    removeReadyFood: (orderId: string) => void,
    updateStaff: (id: string, updates: Partial<Staff>) => void
  ): void {
    // 料理を受け取る
    if (staff.currentOrderId) {
      removeReadyFood(staff.currentOrderId);
    }

    updateStaff(staff.id, { state: 'moving_to_customer' });
  }

  /**
   * お客さんへ移動中の処理
   */
  private handleMovingToCustomer(
    staff: Staff,
    customers: ReturnType<typeof useEntityStore.getState>['customers'],
    deltaTime: number,
    updateStaff: (id: string, updates: Partial<Staff>) => void
  ): void {
    if (!staff.targetCustomerId) {
      // 対象がいなければ待機状態へ
      updateStaff(staff.id, {
        state: 'idle',
        carryingFood: null,
        targetCustomerId: null,
        currentOrderId: null,
        cookingProgress: 0,
        currentFood: null,
      });
      return;
    }

    const targetCustomer = customers.find(
      (c) => c.id === staff.targetCustomerId
    );

    if (!targetCustomer) {
      // お客さんがいなくなった
      updateStaff(staff.id, {
        state: 'idle',
        carryingFood: null,
        targetCustomerId: null,
        currentOrderId: null,
        cookingProgress: 0,
        currentFood: null,
      });
      return;
    }

    const arrived = this.moveTowards(
      staff,
      targetCustomer.position,
      deltaTime,
      updateStaff
    );

    if (arrived) {
      updateStaff(staff.id, { state: 'serving' });
    }
  }

  /**
   * 料理を渡し中の処理
   * 配膳完了後、次の仕事を探す
   */
  private handleServing(
    staff: Staff,
    _staffIndex: number,
    customers: ReturnType<typeof useEntityStore.getState>['customers'],
    updateCustomer: (id: string, updates: Partial<import('../../types').Customer>) => void,
    removeOrder: (orderId: string) => void,
    updateStaff: (id: string, updates: Partial<Staff>) => void,
    allStaff: Staff[]
  ): void {
    const { isClosing, restaurant } = useRestaurantStore.getState();

    // お客さんに料理を渡す
    const targetCustomer = customers.find(
      (c) => c.id === staff.targetCustomerId
    );

    if (targetCustomer && targetCustomer.state === 'waiting') {
      updateCustomer(targetCustomer.id, { state: 'eating' });
    }

    // 注文を削除
    if (staff.currentOrderId) {
      removeOrder(staff.currentOrderId);
    }

    // 閉店処理中は定位置に戻る
    if (isClosing) {
      updateStaff(staff.id, {
        state: 'idle',
        carryingFood: null,
        targetCustomerId: null,
        currentOrderId: null,
        cookingProgress: 0,
        currentFood: null,
      });
      return;
    }

    // 次の仕事を探す
    // 優先順位1: 完成した料理があればキッチンへ（配膳）- 他のスタッフが担当していないもの
    for (const nextOrderId of restaurant.kitchen.readyFoods) {
      if (this.isOrderClaimed(nextOrderId, allStaff, staff.id)) {
        continue;
      }

      const nextOrder = useRestaurantStore.getState().getOrder(nextOrderId);
      if (nextOrder) {
        this.claimOrder(nextOrderId);
        updateStaff(staff.id, {
          state: 'moving_to_kitchen',
          carryingFood: nextOrder.food,
          targetCustomerId: nextOrder.customerId,
          currentOrderId: nextOrderId,
          cookingProgress: 0,
          currentFood: null,
        });
        return;
      }
    }

    // 優先順位2: 未調理の注文があればキッチンへ（調理）- 他のスタッフが担当していないもの
    const pendingOrder = restaurant.kitchen.orders.find(
      (order) => order.state === 'pending' && !this.isOrderClaimed(order.id, allStaff, staff.id)
    );

    if (pendingOrder) {
      this.claimOrder(pendingOrder.id);
      useRestaurantStore.getState().updateOrder(pendingOrder.id, { state: 'cooking' });

      updateStaff(staff.id, {
        state: 'moving_to_kitchen',
        currentOrderId: pendingOrder.id,
        currentFood: pendingOrder.food,
        targetCustomerId: pendingOrder.customerId,
        cookingProgress: 0,
        carryingFood: null,
      });
      return;
    }

    // 何もなければ待機状態へ（定位置に戻る）
    updateStaff(staff.id, {
      state: 'idle',
      carryingFood: null,
      targetCustomerId: null,
      currentOrderId: null,
      cookingProgress: 0,
      currentFood: null,
    });
  }

  /**
   * 目標位置へ移動する
   * @returns 到着したかどうか
   */
  private moveTowards(
    staff: Staff,
    target: Position,
    deltaTime: number,
    updateStaff: (id: string, updates: Partial<Staff>) => void
  ): boolean {
    const dx = target.x - staff.position.x;
    const dy = target.y - staff.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
      updateStaff(staff.id, {
        position: { x: target.x, y: target.y },
      });
      return true;
    }

    const moveDistance = staff.speed * deltaTime;
    const ratio = Math.min(moveDistance / distance, 1);

    updateStaff(staff.id, {
      position: {
        x: staff.position.x + dx * ratio,
        y: staff.position.y + dy * ratio,
      },
    });

    return false;
  }
}
