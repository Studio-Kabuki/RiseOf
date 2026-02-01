import type { GameSystem } from '../GameEngine';
import type { Customer, Position, Order } from '../../types';
import { useEntityStore } from '../../store/entityStore';
import { useRestaurantStore, createOrder, createFood } from '../../store/restaurantStore';
import { useMenuStore } from '../../store/menuStore';
import { ORDERING_DELAY, EATING_TIME, EXIT_POSITION } from '../../constants/game';

export class CustomerSystem implements GameSystem {
  private orderingTimers: Map<string, number> = new Map();

  update(deltaTime: number): void {
    const { customers, updateCustomer, removeCustomer } =
      useEntityStore.getState();
    const { getSeatPosition, addOrder, freeSeat, addMoney } =
      useRestaurantStore.getState();

    for (const customer of customers) {
      switch (customer.state) {
        case 'entering':
          this.handleEntering(customer, deltaTime, getSeatPosition, updateCustomer);
          break;

        case 'seated':
          this.handleSeated(customer, deltaTime, updateCustomer);
          break;

        case 'ordering':
          this.handleOrdering(customer, addOrder, updateCustomer);
          break;

        case 'waiting':
          // 店員が料理を持ってくるのを待つ（StaffSystemが処理）
          break;

        case 'eating':
          this.handleEating(customer, deltaTime, updateCustomer);
          break;

        case 'paying':
          this.handlePaying(customer, freeSeat, addMoney, updateCustomer);
          break;

        case 'leaving':
          this.handleLeaving(customer, deltaTime, updateCustomer, removeCustomer);
          break;
      }
    }
  }

  private handleEntering(
    customer: Customer,
    deltaTime: number,
    getSeatPosition: (seatId: string) => Position | null,
    updateCustomer: (id: string, updates: Partial<Customer>) => void
  ): void {
    if (!customer.assignedSeatId) return;

    const seatPos = getSeatPosition(customer.assignedSeatId);
    if (!seatPos) return;

    const arrived = this.moveTowards(
      customer,
      seatPos,
      deltaTime,
      updateCustomer
    );

    if (arrived) {
      updateCustomer(customer.id, { state: 'seated' });
      this.orderingTimers.set(customer.id, 0);
    }
  }

  private handleSeated(
    customer: Customer,
    deltaTime: number,
    updateCustomer: (id: string, updates: Partial<Customer>) => void
  ): void {
    const timer = (this.orderingTimers.get(customer.id) || 0) + deltaTime;
    this.orderingTimers.set(customer.id, timer);

    if (timer >= ORDERING_DELAY) {
      // 登録メニューからランダム選択
      const { registeredMenus } = useMenuStore.getState();
      if (registeredMenus.length === 0) return; // メニューがない場合は待機

      const randomMenu = registeredMenus[Math.floor(Math.random() * registeredMenus.length)];
      const food = createFood(randomMenu);

      updateCustomer(customer.id, {
        state: 'ordering',
        orderedFood: food,
      });
      this.orderingTimers.delete(customer.id);
    }
  }

  private handleOrdering(
    customer: Customer,
    addOrder: (order: Order) => void,
    updateCustomer: (id: string, updates: Partial<Customer>) => void
  ): void {
    if (!customer.orderedFood) {
      return;
    }

    // 注文を作成
    const order = createOrder(customer.id, customer.orderedFood);
    addOrder(order);

    // 待機状態へ
    updateCustomer(customer.id, { state: 'waiting' });
  }

  private handleEating(
    customer: Customer,
    deltaTime: number,
    updateCustomer: (id: string, updates: Partial<Customer>) => void
  ): void {
    const progress = customer.eatingProgress + deltaTime / EATING_TIME;

    if (progress >= 1) {
      updateCustomer(customer.id, {
        state: 'paying',
        eatingProgress: 1,
      });
    } else {
      updateCustomer(customer.id, { eatingProgress: progress });
    }
  }

  private handlePaying(
    customer: Customer,
    freeSeat: (seatId: string) => void,
    addMoney: (amount: number) => void,
    updateCustomer: (id: string, updates: Partial<Customer>) => void
  ): void {
    // お金を追加（料理の価格）
    const price = customer.orderedFood?.price || 0;
    addMoney(price);

    // 座席を開放
    if (customer.assignedSeatId) {
      freeSeat(customer.assignedSeatId);
    }

    // 退店開始
    updateCustomer(customer.id, {
      state: 'leaving',
    });
  }

  private handleLeaving(
    customer: Customer,
    deltaTime: number,
    updateCustomer: (id: string, updates: Partial<Customer>) => void,
    removeCustomer: (id: string) => void
  ): void {
    const arrived = this.moveTowards(
      customer,
      EXIT_POSITION,
      deltaTime,
      updateCustomer
    );

    if (arrived) {
      removeCustomer(customer.id);
    }
  }

  private moveTowards(
    customer: Customer,
    target: Position,
    deltaTime: number,
    updateCustomer: (id: string, updates: Partial<Customer>) => void
  ): boolean {
    const dx = target.x - customer.position.x;
    const dy = target.y - customer.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
      updateCustomer(customer.id, {
        position: { x: target.x, y: target.y },
      });
      return true;
    }

    const moveDistance = customer.speed * deltaTime;
    const ratio = Math.min(moveDistance / distance, 1);

    updateCustomer(customer.id, {
      position: {
        x: customer.position.x + dx * ratio,
        y: customer.position.y + dy * ratio,
      },
    });

    return false;
  }
}
