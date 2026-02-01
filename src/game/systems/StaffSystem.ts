import type { GameSystem } from '../GameEngine';
import type { Staff, Position } from '../../types';
import { useEntityStore } from '../../store/entityStore';
import { useRestaurantStore } from '../../store/restaurantStore';
import { getStaffIdlePosition } from '../../constants/game';

export class StaffSystem implements GameSystem {
  update(deltaTime: number): void {
    const { staff, updateStaff, customers, updateCustomer } =
      useEntityStore.getState();
    const { restaurant, removeReadyFood, removeOrder } =
      useRestaurantStore.getState();

    for (let i = 0; i < staff.length; i++) {
      const s = staff[i];
      const idlePosition = getStaffIdlePosition(i);

      switch (s.state) {
        case 'idle':
          this.handleIdle(s, i, idlePosition, restaurant.kitchen.readyFoods, deltaTime, updateStaff);
          break;

        case 'moving_to_kitchen':
          this.handleMovingToKitchen(
            s,
            restaurant.kitchen.position,
            deltaTime,
            updateStaff
          );
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
            updateStaff
          );
          break;
      }
    }
  }

  private handleIdle(
    staff: Staff,
    _staffIndex: number,
    idlePosition: Position,
    readyFoods: string[],
    deltaTime: number,
    updateStaff: (id: string, updates: Partial<Staff>) => void
  ): void {
    // まず定位置に戻る
    const dx = idlePosition.x - staff.position.x;
    const dy = idlePosition.y - staff.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 2) {
      // 定位置に移動中
      this.moveTowards(staff, idlePosition, deltaTime, updateStaff);
      return;
    }

    // 定位置にいる場合、完成した料理があればキッチンへ
    if (readyFoods.length > 0) {
      const orderId = readyFoods[0];
      const order = useRestaurantStore.getState().getOrder(orderId);

      if (order) {
        updateStaff(staff.id, {
          state: 'moving_to_kitchen',
          carryingFood: order.food,
          targetCustomerId: order.customerId,
          targetOrderId: orderId,
        });
      }
    }
  }

  private handleMovingToKitchen(
    staff: Staff,
    kitchenPosition: Position,
    deltaTime: number,
    updateStaff: (id: string, updates: Partial<Staff>) => void
  ): void {
    const arrived = this.moveTowards(
      staff,
      kitchenPosition,
      deltaTime,
      updateStaff
    );

    if (arrived) {
      updateStaff(staff.id, { state: 'picking_food' });
    }
  }

  private handlePickingFood(
    staff: Staff,
    removeReadyFood: (orderId: string) => void,
    updateStaff: (id: string, updates: Partial<Staff>) => void
  ): void {
    // 料理を受け取る
    if (staff.targetOrderId) {
      removeReadyFood(staff.targetOrderId);
    }

    updateStaff(staff.id, { state: 'moving_to_customer' });
  }

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
        targetOrderId: null,
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
        targetOrderId: null,
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

  private handleServing(
    staff: Staff,
    _staffIndex: number,
    customers: ReturnType<typeof useEntityStore.getState>['customers'],
    updateCustomer: (id: string, updates: Partial<import('../../types').Customer>) => void,
    removeOrder: (orderId: string) => void,
    updateStaff: (id: string, updates: Partial<Staff>) => void
  ): void {
    // お客さんに料理を渡す
    const targetCustomer = customers.find(
      (c) => c.id === staff.targetCustomerId
    );

    if (targetCustomer && targetCustomer.state === 'waiting') {
      updateCustomer(targetCustomer.id, { state: 'eating' });
    }

    // 注文を削除
    if (staff.targetOrderId) {
      removeOrder(staff.targetOrderId);
    }

    // 完成した料理があればそのままキッチンへ
    const readyFoods = useRestaurantStore.getState().restaurant.kitchen.readyFoods;
    if (readyFoods.length > 0) {
      const nextOrderId = readyFoods[0];
      const nextOrder = useRestaurantStore.getState().getOrder(nextOrderId);

      if (nextOrder) {
        updateStaff(staff.id, {
          state: 'moving_to_kitchen',
          carryingFood: nextOrder.food,
          targetCustomerId: nextOrder.customerId,
          targetOrderId: nextOrderId,
        });
        return;
      }
    }

    // 完成した料理がなければ待機状態へ（定位置に戻る）
    updateStaff(staff.id, {
      state: 'idle',
      carryingFood: null,
      targetCustomerId: null,
      targetOrderId: null,
    });
  }

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
