import type { GameSystem } from '../GameEngine';
import type { Customer, Position, Order } from '../../types';
import { useEntityStore } from '../../store/entityStore';
import { useRestaurantStore, createOrder, createComboFood } from '../../store/restaurantStore';
import { useMenuStore } from '../../store/menuStore';
import { useStaffStore } from '../../store/staffStore';
import { ORDERING_DELAY, EATING_TIME, EXIT_POSITION, CUSTOMER_SPAWN_DELAY } from '../../constants/game';
import { calculateSales } from '../../utils/salesCalculator';

/**
 * 登録メニューから食事時間ボーナスを計算
 * @returns 食事時間の調整値（秒）。正なら時間延長、負なら時間短縮
 */
function calculateEatingTimeBonus(): number {
  const { registeredMenus } = useMenuStore.getState();
  let totalBonus = 0;

  for (const menu of registeredMenus) {
    if (menu.ability === 'eating_time' && menu.params?.eatingTimeBonus !== undefined) {
      const bonus = typeof menu.params.eatingTimeBonus === 'number'
        ? menu.params.eatingTimeBonus
        : 0;
      totalBonus += bonus;
    }
  }

  return totalBonus;
}

export class CustomerSystem implements GameSystem {
  private orderingTimers: Map<string, number> = new Map();
  private spawnTimer: number = 0;

  update(deltaTime: number): void {
    const { customers, updateCustomer, removeCustomer, waitingQueue, promoteWaitingCustomer, addWaitingCustomer, addCustomer } =
      useEntityStore.getState();
    const { getSeatPosition, addOrder, freeSeat, addMoney, recordCustomerServed, getAvailableSeats, assignSeat, isClosing, isOpen } =
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
        // 食事中・支払い中の場合はお金を払う（特殊能力を考慮した売上計算）
        if (customer.state === 'eating' || customer.state === 'paying') {
          const { registeredMenus } = useMenuStore.getState();
          const { todayCustomerCount, addLit } = useRestaurantStore.getState();

          const salesContext = {
            registeredMenus,
            todayCustomerCount: todayCustomerCount + 1,
          };

          const salesResult = calculateSales(registeredMenus, salesContext);
          addMoney(salesResult.totalGold);
          recordCustomerServed(salesResult.totalGold);

          if (salesResult.earnedLit > 0) {
            addLit(salesResult.earnedLit);
          }
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
          this.handlePaying(customer, freeSeat, addMoney, recordCustomerServed, updateCustomer);
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

    // 店員の能力による来店スピードアップを適用
    const { customerSpeedMultiplier } = useStaffStore.getState();
    const adjustedSpawnDelay = CUSTOMER_SPAWN_DELAY / customerSpeedMultiplier;

    if (this.spawnTimer >= adjustedSpawnDelay) {
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
      // 全登録メニューをまとめて注文（コンボ）
      const { registeredMenus } = useMenuStore.getState();
      if (registeredMenus.length === 0) {
        // メニューがない場合は待機状態へ（?吹き出し表示）
        updateCustomer(customer.id, { state: 'waiting_for_menu' });
        this.orderingTimers.delete(customer.id);
        return;
      }

      // 全メニュー合計金額で汎用的な「定食」を作成
      const food = createComboFood(registeredMenus);

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
      // メニューが登録された！全メニュー合計で注文へ
      const food = createComboFood(registeredMenus);

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
    // 食事時間ボーナスを適用（最低0.5秒）
    const eatingTimeBonus = calculateEatingTimeBonus();
    const { customerSpeedMultiplier } = useStaffStore.getState();
    // customerSpeedMultiplierで食事時間も短縮
    const adjustedEatingTime = Math.max(0.5, (EATING_TIME + eatingTimeBonus) / customerSpeedMultiplier);
    const progress = customer.eatingProgress + deltaTime / adjustedEatingTime;

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
    recordCustomerServed: (revenue: number) => void,
    updateCustomer: (id: string, updates: Partial<Customer>) => void
  ): void {
    // 売上計算（特殊能力を考慮）
    const { registeredMenus } = useMenuStore.getState();
    const { todayCustomerCount, addLit, addMoneyEffect } = useRestaurantStore.getState();

    // 今回の会計は todayCustomerCount + 1 人目（recordCustomerServed前なので）
    const salesContext = {
      registeredMenus,
      todayCustomerCount: todayCustomerCount + 1,
    };

    const salesResult = calculateSales(registeredMenus, salesContext);

    // お金を追加
    addMoney(salesResult.totalGold);
    recordCustomerServed(salesResult.totalGold);

    // お金エフェクトを表示
    addMoneyEffect(salesResult.totalGold, customer.position.x, customer.position.y);

    // LIT獲得（辛辛チキンなど）
    if (salesResult.earnedLit > 0) {
      addLit(salesResult.earnedLit);
    }

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

    // customerSpeedMultiplierで移動速度も上げる
    const { customerSpeedMultiplier } = useStaffStore.getState();
    const moveDistance = customer.speed * deltaTime * customerSpeedMultiplier;
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
