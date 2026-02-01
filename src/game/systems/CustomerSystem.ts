import type { GameSystem } from '../GameEngine';
import type { Customer, Position, Order } from '../../types';
import { useEntityStore } from '../../store/entityStore';
import { useRestaurantStore, createOrder, createFood } from '../../store/restaurantStore';
import { useMenuStore } from '../../store/menuStore';
import { ORDERING_DELAY, EATING_TIME, EXIT_POSITION, CUSTOMER_SPAWN_DELAY } from '../../constants/game';

export class CustomerSystem implements GameSystem {
  private orderingTimers: Map<string, number> = new Map();
  private spawnTimer: number = 0;

  update(deltaTime: number): void {
    const { customers, updateCustomer, removeCustomer, waitingQueue, promoteWaitingCustomer, addWaitingCustomer, addCustomer } =
      useEntityStore.getState();
    const { getSeatPosition, addOrder, freeSeat, addMoney, getAvailableSeats, assignSeat, isClosing, isOpen } =
      useRestaurantStore.getState();
    const { gameStarted } = useMenuStore.getState();

    // ゲームが開始されていない場合は処理しない
    if (!gameStarted) return;

    // 開店中かつ閉店処理中でなければスポーンと入店処理
    if (isOpen && !isClosing) {
      // お客さんの自動スポーン処理
      this.handleSpawn(deltaTime, getAvailableSeats, addCustomer, addWaitingCustomer, assignSeat);

      // 待機列から入店処理（空席があれば）
      this.handleWaitingQueuePromotion(waitingQueue, getAvailableSeats, promoteWaitingCustomer, assignSeat);
    }

    for (const customer of customers) {
      // 閉店処理中：全員即座に帰宅させる
      if (isClosing && customer.state !== 'leaving') {
        // 食事中・支払い中の場合はお金を払う
        if (customer.state === 'eating' || customer.state === 'paying') {
          const price = customer.orderedFood?.price || 0;
          addMoney(price);
        }
        // 座席を解放
        if (customer.assignedSeatId) {
          freeSeat(customer.assignedSeatId);
        }
        updateCustomer(customer.id, {
          state: 'leaving',
          orderedFood: null, // 吹き出しを消す
        });
        continue;
      }

      switch (customer.state) {
        case 'waiting_outside':
          // 待機列にいる - 位置はentityStoreで管理
          break;

        case 'entering':
          this.handleEntering(customer, deltaTime, getSeatPosition, updateCustomer);
          break;

        case 'seated':
          this.handleSeated(customer, deltaTime, updateCustomer);
          break;

        case 'waiting_for_menu':
          this.handleWaitingForMenu(customer, deltaTime, updateCustomer);
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

  /**
   * お客さんの自動スポーン処理
   */
  private handleSpawn(
    deltaTime: number,
    getAvailableSeats: () => { id: string }[],
    addCustomer: (seatId: string) => string,
    addWaitingCustomer: () => string,
    assignSeat: (seatId: string, customerId: string) => void
  ): void {
    this.spawnTimer += deltaTime;

    if (this.spawnTimer >= CUSTOMER_SPAWN_DELAY) {
      this.spawnTimer = 0;

      const availableSeats = getAvailableSeats();
      if (availableSeats.length > 0) {
        // 空席があれば直接入店
        const seatId = availableSeats[0].id;
        const customerId = addCustomer(seatId);
        assignSeat(seatId, customerId);
      } else {
        // 満席の場合は待機列に追加
        addWaitingCustomer();
      }
    }
  }

  /**
   * 待機列から入店処理
   */
  private handleWaitingQueuePromotion(
    waitingQueue: string[],
    getAvailableSeats: () => { id: string }[],
    promoteWaitingCustomer: (seatId: string) => string | null,
    assignSeat: (seatId: string, customerId: string) => void
  ): void {
    if (waitingQueue.length === 0) return;

    const availableSeats = getAvailableSeats();
    if (availableSeats.length > 0) {
      const seatId = availableSeats[0].id;
      const customerId = promoteWaitingCustomer(seatId);
      if (customerId) {
        assignSeat(seatId, customerId);
      }
    }
  }

  /**
   * スポーンタイマーをリセット（日終了時に呼び出す）
   */
  resetSpawnTimer(): void {
    this.spawnTimer = 0;
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
      if (registeredMenus.length === 0) {
        // メニューがない場合は待機状態へ（?吹き出し表示）
        updateCustomer(customer.id, { state: 'waiting_for_menu' });
        this.orderingTimers.delete(customer.id);
        return;
      }

      const randomMenu = registeredMenus[Math.floor(Math.random() * registeredMenus.length)];
      const food = createFood(randomMenu);

      updateCustomer(customer.id, {
        state: 'ordering',
        orderedFood: food,
      });
      this.orderingTimers.delete(customer.id);
    }
  }

  /**
   * メニュー待機中の処理
   * メニューが登録されたら注文に進む
   */
  private handleWaitingForMenu(
    customer: Customer,
    _deltaTime: number,
    updateCustomer: (id: string, updates: Partial<Customer>) => void
  ): void {
    const { registeredMenus } = useMenuStore.getState();

    if (registeredMenus.length > 0) {
      // メニューが登録された！ランダム選択して注文へ
      const randomMenu = registeredMenus[Math.floor(Math.random() * registeredMenus.length)];
      const food = createFood(randomMenu);

      updateCustomer(customer.id, {
        state: 'ordering',
        orderedFood: food,
      });
    }
    // メニューがなければそのまま待機を続ける
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
