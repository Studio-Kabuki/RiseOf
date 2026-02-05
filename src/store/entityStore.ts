import { create } from 'zustand';
import type { Customer, Staff, Direction } from '../types';
import type { MenuCategory } from '../types/menu';
import {
  CUSTOMER_SPEED,
  STAFF_SPEED,
  ENTRANCE_POSITION,
  KITCHEN_POSITION,
} from '../constants/game';
import { useEventStore } from './eventStore';

// ランダムな好みを生成（イベントの流行効果を考慮）
const PREFERENCES: MenuCategory[] = ['snack', 'main', 'dessert'];
const getRandomPreference = (): MenuCategory => {
  const eventStore = useEventStore.getState();

  // 各カテゴリの重みを計算（流行イベントで確率UP）
  const weights = PREFERENCES.map(category => eventStore.getPreferenceBoost(category));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // 重み付きランダム選択
  let random = Math.random() * totalWeight;
  for (let i = 0; i < PREFERENCES.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return PREFERENCES[i];
    }
  }
  return PREFERENCES[PREFERENCES.length - 1];
};

// 待機列の位置（店の外）
const WAITING_LINE_START = { x: 100, y: 500 }; // 入口の下（画面外）
const WAITING_LINE_SPACING = 30; // 待機列の間隔

interface EntityState {
  customers: Customer[];
  staff: Staff[];
  waitingQueue: string[]; // 待機中のお客さんID（店外で並んでいる）

  // Customer actions
  addCustomer: (seatId: string, direction?: Direction, servingOffset?: number) => string;
  addWaitingCustomer: () => string; // 待機列にお客さんを追加
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;
  promoteWaitingCustomer: (seatId: string, direction?: Direction, servingOffset?: number) => string | null; // 待機列から入店させる
  getWaitingPosition: (index: number) => { x: number; y: number }; // 待機位置を取得
  clearAllCustomers: () => void; // 全お客さんを即座にクリア

  // Staff actions（調理・配膳両方対応）
  addStaff: () => string;
  removeLastStaff: () => void; // 最後のスタッフを削除
  setStaffCount: (count: number) => void; // スタッフ数を設定（増減に対応）
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  getStaff: (id: string) => Staff | undefined;
  resetAllStaff: () => void; // 全スタッフを定位置に戻す
  syncStaffPositions: () => void; // スタッフの位置を定位置に同期

  // Reset
  reset: () => void;
}

let customerIdCounter = 0;
let staffIdCounter = 0;

export const useEntityStore = create<EntityState>((set, get) => ({
  customers: [],
  staff: [],
  waitingQueue: [],

  addCustomer: (seatId: string, direction?: Direction, servingOffset?: number) => {
    const id = `customer-${++customerIdCounter}`;
    const customer: Customer = {
      id,
      position: getSpawnPosition(),
      speed: CUSTOMER_SPEED,
      state: 'entering',
      assignedSeatId: seatId,
      orderedFood: null,
      eatingProgress: 0,
      direction, // 配膳位置計算用のお客さんの向き
      servingOffset, // 配膳位置のオフセット
      preference: getRandomPreference(), // ランダムな好み
    };
    set((state) => ({
      customers: [...state.customers, customer],
    }));
    return id;
  },

  addWaitingCustomer: () => {
    const id = `customer-${++customerIdCounter}`;
    const waitingIndex = get().waitingQueue.length;
    const waitingPosition = get().getWaitingPosition(waitingIndex);
    const customer: Customer = {
      id,
      position: { ...waitingPosition },
      speed: CUSTOMER_SPEED,
      state: 'waiting_outside' as Customer['state'], // 店外待機状態（後で型に追加）
      assignedSeatId: null,
      orderedFood: null,
      eatingProgress: 0,
      preference: getRandomPreference(), // ランダムな好み
    };
    set((state) => ({
      customers: [...state.customers, customer],
      waitingQueue: [...state.waitingQueue, id],
    }));
    return id;
  },

  updateCustomer: (id, updates) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  removeCustomer: (id) =>
    set((state) => ({
      customers: state.customers.filter((c) => c.id !== id),
      waitingQueue: state.waitingQueue.filter((wid) => wid !== id),
    })),

  getCustomer: (id) => get().customers.find((c) => c.id === id),

  promoteWaitingCustomer: (seatId: string, direction?: Direction, servingOffset?: number) => {
    const { waitingQueue, updateCustomer, customers } = get();
    if (waitingQueue.length === 0) return null;

    const customerId = waitingQueue[0];
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return null;

    // 待機列から削除し、入店状態に変更
    set((state) => ({
      waitingQueue: state.waitingQueue.slice(1),
    }));

    // お客さんを入店状態に更新
    updateCustomer(customerId, {
      state: 'entering',
      assignedSeatId: seatId,
      position: getSpawnPosition(),
      direction, // 配膳位置計算用のお客さんの向き
      servingOffset, // 配膳位置のオフセット
    });

    // 残りの待機客の位置を更新
    const newQueue = get().waitingQueue;
    newQueue.forEach((id, index) => {
      const pos = get().getWaitingPosition(index);
      updateCustomer(id, { position: pos });
    });

    return customerId;
  },

  getWaitingPosition: (index: number) => ({
    x: WAITING_LINE_START.x,
    y: WAITING_LINE_START.y + index * WAITING_LINE_SPACING,
  }),

  clearAllCustomers: () => {
    set({ customers: [], waitingQueue: [] });
  },

  addStaff: () => {
    const id = `staff-${++staffIdCounter}`;
    const currentStaffCount = get().staff.length;
    // 遅延参照を使用してスタッフ位置を取得
    let idlePosition = { x: KITCHEN_POSITION.x + currentStaffCount * 30, y: KITCHEN_POSITION.y };
    if (restaurantStoreRef) {
      idlePosition = restaurantStoreRef.getState().getStaffPosition(currentStaffCount);
    }
    // 統合スタッフ: 調理と配膳の両方を担当
    const staff: Staff = {
      id,
      position: { ...idlePosition },
      speed: STAFF_SPEED,
      state: 'idle',
      currentOrderId: null, // 処理中の注文ID
      currentFood: null, // 調理中の料理
      cookingProgress: 0, // 調理進捗
      carryingFood: null, // 運んでいる料理
      targetCustomerId: null, // 配膳対象の客ID
    };
    set((state) => ({
      staff: [...state.staff, staff],
    }));
    return id;
  },

  removeLastStaff: () => {
    set((state) => ({
      staff: state.staff.slice(0, -1),
    }));
  },

  setStaffCount: (count: number) => {
    const { staff, addStaff, removeLastStaff } = get();
    const currentCount = staff.length;

    if (count > currentCount) {
      // スタッフを追加
      for (let i = 0; i < count - currentCount; i++) {
        addStaff();
      }
    } else if (count < currentCount) {
      // スタッフを削除
      for (let i = 0; i < currentCount - count; i++) {
        removeLastStaff();
      }
    }
  },

  updateStaff: (id, updates) =>
    set((state) => ({
      staff: state.staff.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  getStaff: (id) => get().staff.find((s) => s.id === id),

  resetAllStaff: () => {
    // 遅延参照を使用してスタッフ位置を取得
    const getPosition = (index: number) => {
      if (restaurantStoreRef) {
        return restaurantStoreRef.getState().getStaffPosition(index);
      }
      return { x: KITCHEN_POSITION.x + index * 30, y: KITCHEN_POSITION.y };
    };
    set((state) => ({
      staff: state.staff.map((s, index) => ({
        ...s,
        position: { ...getPosition(index) },
        state: 'idle' as const,
        currentOrderId: null,
        currentFood: null,
        cookingProgress: 0,
        carryingFood: null,
        targetCustomerId: null,
      })),
    }));
  },

  syncStaffPositions: () => {
    // スタッフの位置を定位置に同期（ステートは変更しない）
    const getPosition = (index: number) => {
      if (restaurantStoreRef) {
        return restaurantStoreRef.getState().getStaffPosition(index);
      }
      return { x: KITCHEN_POSITION.x + index * 30, y: KITCHEN_POSITION.y };
    };
    set((state) => ({
      staff: state.staff.map((s, index) => ({
        ...s,
        position: { ...getPosition(index) },
      })),
    }));
  },

  reset: () => {
    customerIdCounter = 0;
    staffIdCounter = 0;
    set({ customers: [], staff: [], waitingQueue: [] });
  },
}));

// 循環依存を避けるため、restaurantStoreへの遅延参照を提供
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let restaurantStoreRef: any = null;
export const setRestaurantStoreRef = (store: unknown) => {
  restaurantStoreRef = store;
};

// スポーン位置を取得するヘルパー
export const getSpawnPosition = () => {
  if (restaurantStoreRef) {
    const spawnPoint = restaurantStoreRef.getState().getSpawnPoint();
    if (spawnPoint) {
      return { x: spawnPoint.x, y: spawnPoint.y };
    }
  }
  return { ...ENTRANCE_POSITION };
};

// スタッフ位置を取得するヘルパー
export const getStaffIdlePosition = (index: number) => {
  if (restaurantStoreRef) {
    return restaurantStoreRef.getState().getStaffPosition(index);
  }
  // フォールバック
  return {
    x: KITCHEN_POSITION.x + index * 30,
    y: KITCHEN_POSITION.y,
  };
};
