import { create } from 'zustand';
import type { Restaurant, Order, Seat, Food, MenuItem } from '../types';
import {
  ENTRANCE_POSITION,
  EXIT_POSITION,
  TABLE_POSITION,
  KITCHEN_POSITION,
  SEAT_OFFSETS,
  DAY_DURATION,
  BASE_RENT,
  RENT_EXPONENT,
  INITIAL_LIT,
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

// ゲーム速度の選択肢
const SPEED_OPTIONS = [1, 2, 5, 10];

interface RestaurantState {
  restaurant: Restaurant;
  money: number;
  lit: number; // LITトークン（ショップ購入用）
  gameTime: number; // ゲーム内経過時間（秒）
  currentDay: number; // 現在の日数（1から開始）
  dayTimeElapsed: number; // 現在の日の経過時間（秒）
  isDayEnded: boolean; // 1日が終了したか
  isPaused: boolean;
  gameSpeed: number; // ゲーム速度倍率

  // 営業状態
  isOpen: boolean; // 店が営業中か（開店ボタンで true に）

  // 家賃（ノルマ）システム
  currentRent: number; // 現在の日の家賃
  isGameOver: boolean; // ゲームオーバー状態
  rentPaid: boolean; // 今日の家賃を支払ったか
  canClose: boolean; // 閉店可能かどうか（時間終了かつノルマ達成）
  showDayEnd: boolean; // 営業終了ダイアログを表示するか
  isClosing: boolean; // 閉店処理中（時間終了、店員が戻る中）

  // Day getters
  getDayProgress: () => number; // 0-1で1日の進捗
  isNormaAchieved: () => boolean; // ノルマ達成しているか

  // 営業アクション
  openStore: () => void; // 開店ボタンを押した時

  // 家賃（ノルマ）アクション
  calculateRent: (day: number) => number; // 指定した日の家賃を計算
  payRent: () => boolean; // 家賃を支払う（成功でtrue、失敗でfalse）
  triggerClose: () => void; // 閉店ボタンを押した時

  // 清算処理
  clearAllSeats: () => void; // 全座席を解放
  clearAllOrders: () => void; // 全注文をクリア

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

  // LIT
  addLit: (amount: number) => void;
  spendLit: (amount: number) => boolean; // 成功でtrue、残高不足でfalse

  // Time
  advanceTime: (deltaTime: number) => void;
  togglePause: () => void;
  startNextDay: () => void; // 次の日を開始

  // Speed
  cycleSpeed: () => void;

  // Reset
  reset: () => void;
}

let orderIdCounter = 0;

// 指定した日の家賃を計算する関数
// Day1: BASE_RENT, Day2: BASE_RENT^1.5, Day3: (BASE_RENT^1.5)^1.5 ...
const calculateRentForDay = (day: number): number => {
  if (day <= 1) return BASE_RENT;
  // 前日の家賃を1.5乗する
  let rent = BASE_RENT;
  for (let i = 1; i < day; i++) {
    rent = Math.pow(rent, RENT_EXPONENT);
  }
  return Math.floor(rent);
};

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  restaurant: createInitialRestaurant(),
  money: 0,
  lit: INITIAL_LIT, // 初期LIT
  gameTime: 0,
  currentDay: 1,
  dayTimeElapsed: 0,
  isDayEnded: false,
  isPaused: true, // ゲーム開始前は一時停止
  gameSpeed: 1,

  // 営業状態
  isOpen: false, // 開店ボタンを押すまで閉店

  // 家賃（ノルマ）システム
  currentRent: BASE_RENT, // 初日の家賃
  isGameOver: false,
  rentPaid: false,
  canClose: false,
  showDayEnd: false,
  isClosing: false,

  getDayProgress: () => {
    const { dayTimeElapsed } = get();
    return Math.min(dayTimeElapsed / DAY_DURATION, 1);
  },

  isNormaAchieved: () => {
    const { money, currentRent } = get();
    return money >= currentRent;
  },

  // 開店ボタンを押した時
  openStore: () => {
    set({ isOpen: true });
  },

  // 指定した日の家賃を計算
  calculateRent: (day: number) => calculateRentForDay(day),

  // 家賃を支払う
  payRent: () => {
    const { money, currentRent } = get();
    if (money >= currentRent) {
      // 支払い成功
      set((state) => ({
        money: state.money - state.currentRent,
        rentPaid: true,
      }));
      return true;
    } else {
      // 支払い失敗 → ゲームオーバー
      set({ isGameOver: true });
      return false;
    }
  },

  // 閉店ボタンを押した時（ノルマ達成時のみ呼べる）
  triggerClose: () => {
    const { canClose } = get();
    const normaAchieved = get().isNormaAchieved();
    if (canClose && normaAchieved) {
      set({ showDayEnd: true, isDayEnded: true });
    }
  },

  // 全座席を解放
  clearAllSeats: () =>
    set((state) => ({
      restaurant: {
        ...state.restaurant,
        tables: state.restaurant.tables.map((table) => ({
          ...table,
          seats: table.seats.map((seat) => ({
            ...seat,
            customerId: null,
          })),
        })),
      },
    })),

  // 全注文をクリア
  clearAllOrders: () =>
    set((state) => ({
      restaurant: {
        ...state.restaurant,
        kitchen: {
          ...state.restaurant.kitchen,
          orders: [],
          readyFoods: [],
        },
      },
    })),

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

  getOrder: (id) => get().restaurant.kitchen.orders.find((o) => o.id === id),

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

  addLit: (amount) =>
    set((state) => ({
      lit: state.lit + amount,
    })),

  spendLit: (amount) => {
    const { lit } = get();
    if (lit >= amount) {
      set((state) => ({
        lit: state.lit - amount,
      }));
      return true;
    }
    return false;
  },

  advanceTime: (deltaTime) =>
    set((state) => {
      // 開店していない場合は時間を進めない
      if (!state.isOpen) {
        return {};
      }

      const newDayTimeElapsed = state.dayTimeElapsed + deltaTime;
      const timeEnded = newDayTimeElapsed >= DAY_DURATION;
      const normaAchieved = state.money >= state.currentRent;

      // 時間終了時の処理（まだcanCloseでもisGameOverでもない場合のみ）
      if (timeEnded && !state.canClose && !state.isGameOver) {
        if (!normaAchieved) {
          // ノルマ未達成 → 即座にゲームオーバー
          return {
            gameTime: state.gameTime + deltaTime,
            dayTimeElapsed: newDayTimeElapsed,
            isGameOver: true,
            isClosing: true,
            isPaused: true,
          };
        } else {
          // ノルマ達成 → 閉店ボタン表示可能に（時間は停止しない）
          return {
            gameTime: state.gameTime + deltaTime,
            dayTimeElapsed: newDayTimeElapsed,
            canClose: true,
            isClosing: true, // 閉店処理中（店員が戻る）
          };
        }
      }

      return {
        gameTime: state.gameTime + deltaTime,
        dayTimeElapsed: newDayTimeElapsed,
      };
    }),

  togglePause: () =>
    set((state) => ({
      isPaused: !state.isPaused,
    })),

  startNextDay: () =>
    set((state) => {
      const nextDay = state.currentDay + 1;
      return {
        currentDay: nextDay,
        dayTimeElapsed: 0,
        isDayEnded: false,
        isPaused: false,
        isOpen: false, // 次の日は閉店状態からスタート
        // 次の日の家賃を設定
        currentRent: calculateRentForDay(nextDay),
        rentPaid: false,
        canClose: false,
        showDayEnd: false,
        isClosing: false,
      };
    }),

  cycleSpeed: () =>
    set((state) => {
      const currentIndex = SPEED_OPTIONS.indexOf(state.gameSpeed);
      const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
      return { gameSpeed: SPEED_OPTIONS[nextIndex] };
    }),

  reset: () => {
    orderIdCounter = 0;
    foodIdCounter = 0;
    set({
      restaurant: createInitialRestaurant(),
      money: 0,
      lit: INITIAL_LIT, // LITをリセット
      gameTime: 0,
      currentDay: 1,
      dayTimeElapsed: 0,
      isDayEnded: false,
      isPaused: true, // リセット後は一時停止状態
      gameSpeed: 1,
      isOpen: false, // 閉店状態からスタート
      // 家賃システムのリセット
      currentRent: BASE_RENT,
      isGameOver: false,
      rentPaid: false,
      canClose: false,
      showDayEnd: false,
      isClosing: false,
    });
  },
}));

let foodIdCounter = 0;

// Helper to create food from menu item
export const createFood = (menu: MenuItem): Food => ({
  id: `food-${++foodIdCounter}`,
  menuId: menu.id,
  name: menu.name,
  iconUrl: menu.iconUrl,
  price: menu.price,
  cookingTime: menu.cookingTime,
});

// Helper to create order with food
export const createOrder = (customerId: string, food: Food): Order => ({
  id: `order-${++orderIdCounter}`,
  customerId,
  food,
  state: 'pending',
  cookingProgress: 0,
});
