import { create } from 'zustand';
import type { Restaurant, Order, Seat } from '../types';
import {
  ENTRANCE_POSITION,
  EXIT_POSITION,
  TABLE_POSITION,
  KITCHEN_POSITION,
  SEAT_OFFSETS,
} from '../constants/game';

// 初期レストラン設定
const createInitialRestaurant = (): Restaurant => ({
  tables: [
    {
      id: 'table-1',
      position: { ...TABLE_POSITION },
      seats: SEAT_OFFSETS.map((offset, i) => ({
        id: `seat-${i}`,
        localPosition: offset,
        customerId: null,
      })),
    },
  ],
  kitchen: {
    position: { ...KITCHEN_POSITION },
    orders: [],
    readyFoods: [],
  },
  entrancePosition: { ...ENTRANCE_POSITION },
  exitPosition: { ...EXIT_POSITION },
});

interface RestaurantState {
  restaurant: Restaurant;
  money: number;
  gameTime: number; // ゲーム内経過時間（秒）
  isPaused: boolean;

  // Seat actions
  assignSeat: (seatId: string, customerId: string) => void;
  freeSeat: (seatId: string) => void;
  getAvailableSeats: () => Seat[];
  getSeatPosition: (seatId: string) => { x: number; y: number } | null;

  // Order actions
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  removeOrder: (id: string) => void;
  getOrder: (id: string) => Order | undefined;
  addReadyFood: (orderId: string) => void;
  removeReadyFood: (orderId: string) => void;

  // Money
  addMoney: (amount: number) => void;

  // Time
  advanceTime: (deltaTime: number) => void;
  togglePause: () => void;

  // Reset
  reset: () => void;
}

let orderIdCounter = 0;

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  restaurant: createInitialRestaurant(),
  money: 0,
  gameTime: 0,
  isPaused: false,

  assignSeat: (seatId, customerId) =>
    set((state) => ({
      restaurant: {
        ...state.restaurant,
        tables: state.restaurant.tables.map((table) => ({
          ...table,
          seats: table.seats.map((seat) =>
            seat.id === seatId ? { ...seat, customerId } : seat
          ),
        })),
      },
    })),

  freeSeat: (seatId) =>
    set((state) => ({
      restaurant: {
        ...state.restaurant,
        tables: state.restaurant.tables.map((table) => ({
          ...table,
          seats: table.seats.map((seat) =>
            seat.id === seatId ? { ...seat, customerId: null } : seat
          ),
        })),
      },
    })),

  getAvailableSeats: () => {
    const { restaurant } = get();
    const availableSeats: Seat[] = [];
    for (const table of restaurant.tables) {
      for (const seat of table.seats) {
        if (seat.customerId === null) {
          availableSeats.push(seat);
        }
      }
    }
    return availableSeats;
  },

  getSeatPosition: (seatId) => {
    const { restaurant } = get();
    for (const table of restaurant.tables) {
      for (const seat of table.seats) {
        if (seat.id === seatId) {
          return {
            x: table.position.x + seat.localPosition.x,
            y: table.position.y + seat.localPosition.y,
          };
        }
      }
    }
    return null;
  },

  addOrder: (order) =>
    set((state) => ({
      restaurant: {
        ...state.restaurant,
        kitchen: {
          ...state.restaurant.kitchen,
          orders: [...state.restaurant.kitchen.orders, order],
        },
      },
    })),

  updateOrder: (id, updates) =>
    set((state) => ({
      restaurant: {
        ...state.restaurant,
        kitchen: {
          ...state.restaurant.kitchen,
          orders: state.restaurant.kitchen.orders.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        },
      },
    })),

  removeOrder: (id) =>
    set((state) => ({
      restaurant: {
        ...state.restaurant,
        kitchen: {
          ...state.restaurant.kitchen,
          orders: state.restaurant.kitchen.orders.filter((o) => o.id !== id),
        },
      },
    })),

  getOrder: (id) =>
    get().restaurant.kitchen.orders.find((o) => o.id === id),

  addReadyFood: (orderId) =>
    set((state) => ({
      restaurant: {
        ...state.restaurant,
        kitchen: {
          ...state.restaurant.kitchen,
          readyFoods: [...state.restaurant.kitchen.readyFoods, orderId],
        },
      },
    })),

  removeReadyFood: (orderId) =>
    set((state) => ({
      restaurant: {
        ...state.restaurant,
        kitchen: {
          ...state.restaurant.kitchen,
          readyFoods: state.restaurant.kitchen.readyFoods.filter(
            (id) => id !== orderId
          ),
        },
      },
    })),

  addMoney: (amount) =>
    set((state) => ({
      money: state.money + amount,
    })),

  advanceTime: (deltaTime) =>
    set((state) => ({
      gameTime: state.gameTime + deltaTime,
    })),

  togglePause: () =>
    set((state) => ({
      isPaused: !state.isPaused,
    })),

  reset: () => {
    orderIdCounter = 0;
    set({
      restaurant: createInitialRestaurant(),
      money: 0,
      gameTime: 0,
      isPaused: false,
    });
  },
}));

// Helper to create order
export const createOrder = (customerId: string, menuId: string): Order => ({
  id: `order-${++orderIdCounter}`,
  customerId,
  menuId,
  state: 'pending',
  cookingProgress: 0,
});
