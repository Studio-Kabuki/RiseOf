import { create } from 'zustand';
import type { Customer, Staff, Cook } from '../types';
import {
  CUSTOMER_SPEED,
  STAFF_SPEED,
  COOK_SPEED,
  ENTRANCE_POSITION,
  getStaffIdlePosition,
  getCookIdlePosition,
} from '../constants/game';

// 待機列の位置（店の外）
const WAITING_LINE_START = { x: 100, y: 500 }; // 入口の下（画面外）
const WAITING_LINE_SPACING = 30; // 待機列の間隔

interface EntityState {
  customers: Customer[];
  staff: Staff[];
  cooks: Cook[];
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

  // Staff actions
  addStaff: () => string;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  getStaff: (id: string) => Staff | undefined;
  resetAllStaff: () => void; // 全スタッフを定位置に戻す

  // Cook actions
  addCook: () => string;
  updateCook: (id: string, updates: Partial<Cook>) => void;
  getCook: (id: string) => Cook | undefined;
  resetAllCooks: () => void; // 全コックを定位置に戻す

  // Reset
  reset: () => void;
}

let customerIdCounter = 0;
let staffIdCounter = 0;
let cookIdCounter = 0;

export const useEntityStore = create<EntityState>((set, get) => ({
  customers: [],
  staff: [],
  cooks: [],
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
    const staff: Staff = {
      id,
      position: { ...idlePosition },
      speed: STAFF_SPEED,
      state: 'idle',
      carryingFood: null,
      targetCustomerId: null,
      targetOrderId: null,
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
        carryingFood: null,
        targetCustomerId: null,
        targetOrderId: null,
      })),
    }));
  },

  // Cook actions
  addCook: () => {
    const id = `cook-${++cookIdCounter}`;
    const currentCookCount = get().cooks.length;
    const idlePosition = getCookIdlePosition(currentCookCount);
    const cook: Cook = {
      id,
      position: { ...idlePosition },
      speed: COOK_SPEED,
      state: 'idle',
      currentOrderId: null,
      currentFood: null,
      cookingProgress: 0,
    };
    set((state) => ({
      cooks: [...state.cooks, cook],
    }));
    return id;
  },

  updateCook: (id, updates) =>
    set((state) => ({
      cooks: state.cooks.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  getCook: (id) => get().cooks.find((c) => c.id === id),

  resetAllCooks: () => {
    set((state) => ({
      cooks: state.cooks.map((c, index) => ({
        ...c,
        position: { ...getCookIdlePosition(index) },
        state: 'idle' as const,
        currentOrderId: null,
        currentFood: null,
        cookingProgress: 0,
      })),
    }));
  },

  reset: () => {
    customerIdCounter = 0;
    staffIdCounter = 0;
    cookIdCounter = 0;
    set({ customers: [], staff: [], cooks: [], waitingQueue: [] });
  },
}));
