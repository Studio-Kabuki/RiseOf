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

interface EntityState {
  customers: Customer[];
  staff: Staff[];
  cooks: Cook[];

  // Customer actions
  addCustomer: (seatId: string) => string;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;

  // Staff actions
  addStaff: () => string;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  getStaff: (id: string) => Staff | undefined;

  // Cook actions
  addCook: () => string;
  updateCook: (id: string, updates: Partial<Cook>) => void;
  getCook: (id: string) => Cook | undefined;

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

  updateCustomer: (id, updates) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  removeCustomer: (id) =>
    set((state) => ({
      customers: state.customers.filter((c) => c.id !== id),
    })),

  getCustomer: (id) => get().customers.find((c) => c.id === id),

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

  reset: () => {
    customerIdCounter = 0;
    staffIdCounter = 0;
    cookIdCounter = 0;
    set({ customers: [], staff: [], cooks: [] });
  },
}));
