import type { GameSystem } from '../GameEngine';
import type { Staff, Position } from '../../types';
import { useEntityStore } from '../../store/entityStore';
import { useRestaurantStore } from '../../store/restaurantStore';
import { STAFF_IDLE_POSITION } from '../../constants/game';

export class StaffSystem implements GameSystem {
  update(deltaTime: number): void {
    const { staff, updateStaff, customers, updateCustomer } =
      useEntityStore.getState();
    const { restaurant, removeReadyFood, removeOrder } =
      useRestaurantStore.getState();

    for (const s of staff) {
      switch (s.state) {
        case 'idle':
          this.handleIdle(s, restaurant.kitchen.readyFoods, updateStaff);
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
    readyFoods: string[],
    updateStaff: (id: string, updates: Partial<Staff>) => void
  ): void {
    if (readyFoods.length > 0) {
      // 完成した料理があればキッチンへ
      const orderId = readyFoods[0];
      const order = useRestaurantStore.getState().getOrder(orderId);

      if (order) {
        updateStaff(staff.id, {
          state: 'moving_to_kitchen',
          carryingFoodId: orderId,
          targetCustomerId: order.customerId,
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
    if (staff.carryingFoodId) {
      removeReadyFood(staff.carryingFoodId);
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
      // 対象がいなければ待機位置へ
      updateStaff(staff.id, {
        state: 'idle',
        carryingFoodId: null,
        targetCustomerId: null,
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
        carryingFoodId: null,
        targetCustomerId: null,
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
    if (staff.carryingFoodId) {
      removeOrder(staff.carryingFoodId);
    }

    // 待機位置へ戻る
    updateStaff(staff.id, {
      state: 'idle',
      carryingFoodId: null,
      targetCustomerId: null,
      targetPosition: { ...STAFF_IDLE_POSITION },
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
