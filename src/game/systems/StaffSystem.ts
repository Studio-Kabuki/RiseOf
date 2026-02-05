import type { GameSystem } from '../GameEngine';
import type { Staff, Position, Order, Direction, Customer } from '../../types';
import { useEntityStore } from '../../store/entityStore';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useStaffStore } from '../../store/staffStore';
import { COOKING_TIME } from '../../constants/game';
import {
  type PathState,
  createPathState,
  getNextWaypoint,
  isPathValid,
  getCellSize,
} from '../../utils/pathfinding';

// 配膳完了とみなす距離（ピクセル）
const SERVING_DISTANCE = 30;

/**
 * お客さんの向きに基づいて配膳位置を計算
 * 配膳位置はお客さんが向いている方向の(1 + servingOffset)タイル先
 * @param customerPos お客さんの位置
 * @param direction お客さんが向いている方向
 * @param servingOffset 追加オフセット（デフォルト0）
 * @returns 配膳位置
 */
function calculateServingPosition(
  customerPos: Position,
  direction: Direction | undefined,
  servingOffset?: number
): Position {
  const cellSize = getCellSize();
  // デフォルト1マス + servingOffset
  const offset = cellSize * (1 + (servingOffset ?? 0));

  // directionが指定されていない場合はお客さんの位置をそのまま返す
  if (!direction) {
    return customerPos;
  }

  switch (direction) {
    case 'left':
      return { x: customerPos.x - offset, y: customerPos.y };
    case 'right':
      return { x: customerPos.x + offset, y: customerPos.y };
    case 'up':
      return { x: customerPos.x, y: customerPos.y - offset };
    case 'down':
      return { x: customerPos.x, y: customerPos.y + offset };
    default:
      return customerPos;
  }
}

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
  // スタッフごとの経路状態
  private pathStates: Map<string, PathState> = new Map();

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
        this.clearPathState(s.id);
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

    // 調理時間を取得（全料理共通でCOOKING_TIME定数を使用）
    // 店員の能力による調理時間短縮を適用
    const { cookingSpeedMultiplier } = useStaffStore.getState();
    const cookingTime = COOKING_TIME * cookingSpeedMultiplier;
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
   * お客さんの向きに基づいて配膳位置（テーブル上）に移動
   */
  private handleMovingToCustomer(
    staff: Staff,
    customers: Customer[],
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

    // 配膳位置を計算（お客さんの向きに基づいて(1+offset)タイル先のテーブル上）
    const servingPosition = calculateServingPosition(
      targetCustomer.position,
      targetCustomer.direction,
      targetCustomer.servingOffset
    );

    // デバッグログ（初回のみ）
    if (!this.pathStates.has(staff.id)) {
      console.log('[Serving] Customer direction:', targetCustomer.direction,
        'Position:', targetCustomer.position,
        'Serving position:', servingPosition);
    }

    // 配膳はSERVING_DISTANCEまで近づいたら完了とみなす
    const arrived = this.moveTowards(
      staff,
      servingPosition,
      deltaTime,
      updateStaff,
      SERVING_DISTANCE
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
    _allStaff: Staff[]
  ): void {

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

    // 配膳完了後は必ず定位置に戻る（次の仕事はidleステートで探す）
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
   * 目標位置へ経路探索で移動する
   * @returns 到着したかどうか
   */
  private moveTowards(
    staff: Staff,
    target: Position,
    deltaTime: number,
    updateStaff: (id: string, updates: Partial<Staff>) => void,
    arrivalDistance: number = 2
  ): boolean {
    // 最終目標までの距離をチェック
    const dxFinal = target.x - staff.position.x;
    const dyFinal = target.y - staff.position.y;
    const distanceToTarget = Math.sqrt(dxFinal * dxFinal + dyFinal * dyFinal);

    // 到着判定
    if (distanceToTarget <= arrivalDistance) {
      // 経路状態をクリア
      this.pathStates.delete(staff.id);
      return true;
    }

    // 経路状態を取得または作成
    let pathState = this.pathStates.get(staff.id);
    if (!pathState || !isPathValid(pathState, target)) {
      // 新しい経路を計算
      pathState = createPathState(staff.position, target);
      this.pathStates.set(staff.id, pathState);
    }

    // 次のウェイポイントを取得
    const waypoint = getNextWaypoint(pathState, staff.position, 8);

    // 移動先を決定（ウェイポイントがなければ最終目標に直接向かう）
    let moveTarget: Position;
    if (!waypoint) {
      // 経路完了、最終目標に直接向かう
      this.pathStates.delete(staff.id);
      moveTarget = target;
    } else {
      moveTarget = waypoint;
    }

    // 移動先に向かって移動
    const dx = moveTarget.x - staff.position.x;
    const dy = moveTarget.y - staff.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) {
      // ウェイポイントに到達
      return false;
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

  /**
   * スタッフの経路状態をクリア
   */
  private clearPathState(staffId: string): void {
    this.pathStates.delete(staffId);
  }
}
