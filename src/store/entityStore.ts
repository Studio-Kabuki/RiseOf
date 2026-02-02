import { create } from 'zustand';
import type { Customer, Staff } from '../types';
import {
  CUSTOMER_SPEED,
  STAFF_SPEED,
  ENTRANCE_POSITION,
  getStaffIdlePosition,
} from '../constants/game';

// 待機列の位置（店の外）
const WAITING_LINE_START = { x: 100, y: 500 }; // 入口の下（画面外）
const WAITING_LINE_SPACING = 30; // 待機列の間隔

interface EntityState {
  customers: Customer[];
  staff: Staff[];
  waitingQueue: string[]; // 待機中のお客さんID（店外で並んでいる）

  // Customer actions
  addCustomer: (seatId: string) => string;
  addWaitingCustomer: () => string; // 待機列にお客さんを追加
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;
  promoteWaitingCustomer: (seatId: string) => string | null; // 待機列から入店させる
  getWaitingPosition: (index: number) => { x: number; y: number }; // 待機位置を取得
  clearAllCustomers: () => void; // 全お客さんを即座にクリア

  // Staff actions（調理・配膳両方対応）
  addStaff: () => string;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  getStaff: (id: string) => Staff | undefined;
  resetAllStaff: () => void; // 全スタッフを定位置に戻す

  // Reset
  reset: () => void;
}

let customerIdCounter = 0;
let staffIdCounter = 0;

export const useEntityStore = create<EntityState>((set, get) => ({
  customers: [],
  staff: [],
  waitingQueue: [],

  addCustomer: (seatId: string) => {
    const id = `customer-${++customerIdCounter}`;
    const customer: Customer = {
      id,
      position: { ...ENTRANCE_POSITION },
      speed: CUSTOMER_SPEED,
      state: 'entering',
      assignedSeatId: seatId,
      orderedFood: null,
      eatingProgress: 0,
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

  promoteWaitingCustomer: (seatId: string) => {
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
      position: { ...ENTRANCE_POSITION },
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
    const idlePosition = getStaffIdlePosition(currentStaffCount);
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

  updateStaff: (id, updates) =>
    set((state) => ({
      staff: state.staff.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  getStaff: (id) => get().staff.find((s) => s.id === id),

  resetAllStaff: () => {
    set((state) => ({
      staff: state.staff.map((s, index) => ({
        ...s,
        position: { ...getStaffIdlePosition(index) },
        state: 'idle' as const,
        currentOrderId: null,
        currentFood: null,
        cookingProgress: 0,
        carryingFood: null,
        targetCustomerId: null,
      })),
    }));
  },

  reset: () => {
    customerIdCounter = 0;
    staffIdCounter = 0;
    set({ customers: [], staff: [], waitingQueue: [] });
  },
}));
