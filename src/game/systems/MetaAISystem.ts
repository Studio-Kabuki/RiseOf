/**
 * MetaAISystem.ts
 * スタッフの割り当てを管理するメタAIシステム
 *
 * 主な責務:
 * 1. 新しい注文が入ったとき、調理場所に一番近くて手が空いているスタッフを割り当てる
 * 2. 調理が完了したとき、配膳を担当するスタッフを割り当てる
 * 3. 同時に複数のスタッフが同じリクエストを処理しないよう管理する
 */

import type { Staff, Position } from '../../types';
import { useEntityStore } from '../../store/entityStore';
import { useRestaurantStore } from '../../store/restaurantStore';

export class MetaAISystem {
  // 割り当て済みの注文ID（注文→配膳まで追跡）
  private assignedOrders: Set<string> = new Set();

  /**
   * 2点間の距離を計算する
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 最も近い空きスタッフを見つける
   * @param targetPosition 目標位置（キッチンや客席など）
   * @param staffList スタッフリスト
   * @returns 最も近い空きスタッフ、見つからない場合はnull
   */
  findNearestIdleStaff(targetPosition: Position, staffList: Staff[]): Staff | null {
    let nearestStaff: Staff | null = null;
    let minDistance = Infinity;

    for (const staff of staffList) {
      // idle状態のスタッフのみ対象
      if (staff.state !== 'idle') {
        continue;
      }

      const distance = this.calculateDistance(staff.position, targetPosition);

      if (distance < minDistance) {
        minDistance = distance;
        nearestStaff = staff;
      }
    }

    return nearestStaff;
  }

  /**
   * スタッフが既にその注文を処理しているかチェック
   * @param orderId 注文ID
   * @returns 既に割り当て済みならtrue
   */
  isOrderAssigned(orderId: string): boolean {
    return this.assignedOrders.has(orderId);
  }

  /**
   * 新しい注文にスタッフを割り当てる（調理完了後の配膳用）
   * @param orderId 注文ID
   */
  assignStaffToOrder(orderId: string): void {
    // 既に割り当て済みなら何もしない
    if (this.isOrderAssigned(orderId)) {
      return;
    }

    const { staff, updateStaff } = useEntityStore.getState();
    const { restaurant, getOrder } = useRestaurantStore.getState();

    const order = getOrder(orderId);
    if (!order) {
      return;
    }

    // キッチン位置に最も近い空きスタッフを探す
    const kitchenPosition = restaurant.kitchen.position;
    const nearestStaff = this.findNearestIdleStaff(kitchenPosition, staff);

    if (nearestStaff) {
      // スタッフを割り当て
      this.assignedOrders.add(orderId);

      updateStaff(nearestStaff.id, {
        state: 'moving_to_kitchen',
        carryingFood: order.food,
        targetCustomerId: order.customerId,
        currentOrderId: orderId,
      });
    }
  }

  /**
   * 完成した料理の配膳にスタッフを割り当てる
   * readyFoodsから完成した注文を取得し、空いているスタッフを割り当てる
   * @param orderId 注文ID
   */
  assignStaffToDelivery(orderId: string): void {
    // assignStaffToOrderと同じ処理（配膳の割り当て）
    this.assignStaffToOrder(orderId);
  }

  /**
   * 注文の割り当てを解除する（配膳完了時に呼び出す）
   * @param orderId 注文ID
   */
  releaseOrder(orderId: string): void {
    this.assignedOrders.delete(orderId);
  }

  /**
   * 全ての割り当てをリセットする（日の終了時など）
   */
  reset(): void {
    this.assignedOrders.clear();
  }

  /**
   * 現在の割り当て状況を取得（デバッグ用）
   */
  getAssignedOrders(): string[] {
    return Array.from(this.assignedOrders);
  }
}

// シングルトンインスタンスをエクスポート
export const metaAISystem = new MetaAISystem();
