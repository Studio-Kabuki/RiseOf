import { create } from 'zustand';
import type { Restaurant, Order, Seat, Food, MenuItem } from '../types';
import type { StaffPositionData, SpawnPointData } from '../utils/tmxParser';
import {
  ENTRANCE_POSITION,
  EXIT_POSITION,
  TABLE_POSITION,
  KITCHEN_POSITION,
  SEAT_OFFSETS,
  ADDITIONAL_TABLE_POSITIONS,
  DAY_DURATION,
  INITIAL_LIT,
  ICONS,
  calculateRent,
  SEAT_COUNT,
} from '../constants/game';
import { useEntityStore, setRestaurantStoreRef } from './entityStore';
import { useStaffStore } from './staffStore';

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
const SPEED_OPTIONS = [1, 2, 10, 50];

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

  // 今日の統計データ
  todayCustomerCount: number; // 今日さばいたお客さんの数
  todayRevenue: number; // 今日の売上

  // 家賃（ノルマ）システム
  currentRent: number; // 現在の日の家賃
  isGameOver: boolean; // ゲームオーバー状態
  rentPaid: boolean; // 今日の家賃を支払ったか
  canClose: boolean; // 閉店可能かどうか（時間終了かつノルマ達成）
  showDayEnd: boolean; // 営業終了ダイアログを表示するか
  isClosing: boolean; // 閉店処理中（時間終了、店員が戻る中）

  // 店拡張機能
  showUpgrade: boolean; // アップグレードウィンドウを表示するか
  lastUpgradeDay: number; // 最後にアップグレードした日
  seatCount: number; // 現在の座席数
  tableUnlockLevel: number; // テーブル解放レベル（この値以下のindexを持つテーブルが利用可能）

  // お金エフェクト
  moneyEffects: Array<{ id: string; amount: number; x: number; y: number; createdAt: number }>;

  // TMXから読み込んだ位置データ
  staffPositions: StaffPositionData[]; // スタッフ初期位置
  spawnPoints: SpawnPointData[]; // お客さん生成位置

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

  // 統計更新（お客さん会計時に呼ぶ）
  recordCustomerServed: (revenue: number) => void;

  // LIT
  addLit: (amount: number) => void;
  spendLit: (amount: number) => boolean; // 成功でtrue、残高不足でfalse

  // Time
  advanceTime: (deltaTime: number) => void;
  togglePause: () => void;
  startNextDay: () => void; // 次の日を開始

  // Speed
  cycleSpeed: () => void;

  // 店拡張アクション
  openUpgrade: () => void;
  closeUpgrade: () => void;
  canShowUpgrade: () => boolean; // アップグレード可能かどうか
  addSeat: () => void; // 座席を1つ追加

  // TMXからテーブルを設定
  setTables: (tables: import('../types').Table[]) => void;

  // TMXからスタッフ位置を設定
  setStaffPositions: (positions: StaffPositionData[]) => void;

  // TMXからスポーン位置を設定
  setSpawnPoints: (points: SpawnPointData[]) => void;

  // スタッフの初期位置を取得
  getStaffPosition: (index: number) => { x: number; y: number };

  // スポーン位置を取得
  getSpawnPoint: () => SpawnPointData | null;

  // テーブル解放
  getUnlockedTables: () => import('../types').Table[]; // 解放済みテーブルを取得
  unlockNextTable: () => boolean; // 次のテーブルを解放（成功でtrue）

  // エフェクトアクション
  addMoneyEffect: (amount: number, x: number, y: number) => void;
  removeMoneyEffect: (id: string) => void;
  clearMoneyEffects: () => void;

  // Reset
  reset: () => void;
}

let orderIdCounter = 0;

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

  // 今日の統計データ
  todayCustomerCount: 0,
  todayRevenue: 0,

  // 家賃（ノルマ）システム
  currentRent: calculateRent(1), // 初日の家賃
  isGameOver: false,
  rentPaid: false,
  canClose: false,
  showDayEnd: false,
  isClosing: false,

  // 店拡張機能
  showUpgrade: false,
  lastUpgradeDay: 0,
  seatCount: SEAT_COUNT,
  tableUnlockLevel: 2, // 初期は index <= 2 のテーブルを解放

  // お金エフェクト
  moneyEffects: [],

  // TMXから読み込んだ位置データ
  staffPositions: [],
  spawnPoints: [],

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

  // 指定した日の家賃を計算（constants/game.tsのDAILY_QUOTASを使用）
  calculateRent: (day: number) => calculateRent(day),

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
    const { restaurant, tableUnlockLevel } = get();
    const availableSeats: Seat[] = [];
    for (const table of restaurant.tables) {
      // 解放レベル以下のテーブルのみ対象
      if (table.index !== undefined && table.index > tableUnlockLevel) {
        continue;
      }
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

  recordCustomerServed: (revenue) =>
    set((state) => ({
      todayCustomerCount: state.todayCustomerCount + 1,
      todayRevenue: state.todayRevenue + revenue,
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

      // 時間終了時の処理（まだcanCloseでもisGameOverでもない場合のみ）
      if (timeEnded && !state.canClose && !state.isGameOver) {
        // 店内にいるお客さんの未払い金額を計算
        const entityState = useEntityStore.getState();
        const pendingRevenue = entityState.customers.reduce((sum, customer) => {
          // 店内にいるお客さん（leaving, waiting_outside, paying以外）の注文金額
          if (
            customer.state !== 'leaving' &&
            customer.state !== 'waiting_outside' &&
            customer.state !== 'paying'
          ) {
            if (customer.orderedFood) {
              return sum + customer.orderedFood.price;
            }
          }
          return sum;
        }, 0);

        // 現在のお金 + 未払い金額でノルマ判定
        const normaAchieved =
          state.money + pendingRevenue >= state.currentRent;

        // デバッグログ
        console.log('[ノルマ判定]', {
          money: state.money,
          pendingRevenue,
          total: state.money + pendingRevenue,
          currentRent: state.currentRent,
          normaAchieved,
        });

        if (!normaAchieved) {
          // ノルマ未達成 → 即座にゲームオーバー
          console.log('[ゲームオーバー] ノルマ未達成');
          return {
            gameTime: state.gameTime + deltaTime,
            dayTimeElapsed: newDayTimeElapsed,
            isGameOver: true,
            isClosing: true,
            isPaused: true,
          };
        } else {
          // ノルマ達成 → 閉店ボタン表示可能に（時間は停止しない）
          console.log('[ノルマ達成] 閉店可能');
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
        currentRent: calculateRent(nextDay),
        rentPaid: false,
        canClose: false,
        showDayEnd: false,
        isClosing: false,
        // 統計データをリセット
        todayCustomerCount: 0,
        todayRevenue: 0,
      };
    }),

  cycleSpeed: () =>
    set((state) => {
      const currentIndex = SPEED_OPTIONS.indexOf(state.gameSpeed);
      const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
      return { gameSpeed: SPEED_OPTIONS[nextIndex] };
    }),

  // 店拡張アクション
  openUpgrade: () => {
    set({ showUpgrade: true });
  },

  closeUpgrade: () => {
    const { currentDay } = get();
    set({ showUpgrade: false, lastUpgradeDay: currentDay });
  },

  canShowUpgrade: () => {
    const { currentDay, lastUpgradeDay } = get();
    // 3日ごとにアップグレード可能（Day 3, 6, 9...）
    return currentDay >= 3 && currentDay % 3 === 0 && lastUpgradeDay !== currentDay;
  },

  addSeat: () => {
    set((state) => {
      // テーブル数から追加位置を決定（最大4回まで）
      const currentTableCount = state.restaurant.tables.length;
      const additionalIndex = currentTableCount - 1; // 初期テーブルを除いたインデックス

      if (additionalIndex >= ADDITIONAL_TABLE_POSITIONS.length) {
        // 追加可能なテーブルがもうない
        return {};
      }

      const newTablePosition = ADDITIONAL_TABLE_POSITIONS[additionalIndex];
      const currentSeatCount = state.seatCount;

      // 新しいテーブルを作成（4席）
      const newTable = {
        id: `table-${currentTableCount + 1}`,
        position: { ...newTablePosition },
        seats: SEAT_OFFSETS.map((offset, i) => ({
          id: `seat-${currentSeatCount + i}`,
          localPosition: offset,
          customerId: null,
        })),
      };

      return {
        seatCount: currentSeatCount + 4,
        restaurant: {
          ...state.restaurant,
          tables: [...state.restaurant.tables, newTable],
        },
      };
    });
  },

  // TMXからテーブルを設定
  setTables: (tables) => {
    set((state) => {
      // 解放済みテーブルの座席数を計算
      const unlockedSeats = tables
        .filter((t) => t.index === undefined || t.index <= state.tableUnlockLevel)
        .reduce((sum, table) => sum + table.seats.length, 0);
      return {
        seatCount: unlockedSeats,
        restaurant: {
          ...state.restaurant,
          tables,
        },
      };
    });
  },

  // TMXからスタッフ位置を設定
  setStaffPositions: (positions) => {
    set({ staffPositions: positions });
    // スタッフ枠をタイルマップのスタッフオブジェクト数に設定
    useStaffStore.getState().setMaxStaffSlots(positions.length);
  },

  // TMXからスポーン位置を設定
  setSpawnPoints: (points) => {
    set({ spawnPoints: points });
  },

  // スタッフの初期位置を取得
  getStaffPosition: (index) => {
    const { staffPositions } = get();
    const pos = staffPositions.find((p) => p.index === index);
    if (pos) {
      return { x: pos.x, y: pos.y };
    }
    // フォールバック: 古い計算式を使用
    return {
      x: KITCHEN_POSITION.x + index * 30,
      y: KITCHEN_POSITION.y,
    };
  },

  // スポーン位置を取得
  getSpawnPoint: () => {
    const { spawnPoints } = get();
    if (spawnPoints.length > 0) {
      return spawnPoints[0];
    }
    return null;
  },

  // 解放済みテーブルを取得
  getUnlockedTables: () => {
    const { restaurant, tableUnlockLevel } = get();
    return restaurant.tables.filter(
      (table) => table.index === undefined || table.index <= tableUnlockLevel
    );
  },

  // 次のテーブルを解放
  unlockNextTable: () => {
    const { restaurant, tableUnlockLevel } = get();
    // 次に解放可能なテーブルがあるか確認
    const nextTable = restaurant.tables.find((t) => t.index === tableUnlockLevel + 1);
    if (nextTable) {
      set((state) => {
        const newLevel = state.tableUnlockLevel + 1;
        // 解放済みテーブルの座席数を再計算
        const unlockedSeats = state.restaurant.tables
          .filter((t) => t.index === undefined || t.index <= newLevel)
          .reduce((sum, table) => sum + table.seats.length, 0);
        return {
          tableUnlockLevel: newLevel,
          seatCount: unlockedSeats,
        };
      });
      return true;
    }
    return false;
  },

  // エフェクトアクション
  addMoneyEffect: (amount: number, x: number, y: number) => {
    const id = `effect-${Date.now()}-${Math.random()}`;
    set((state) => ({
      moneyEffects: [...state.moneyEffects, { id, amount, x, y, createdAt: Date.now() }],
    }));
    // 1.5秒後に自動削除
    setTimeout(() => {
      get().removeMoneyEffect(id);
    }, 1500);
  },

  removeMoneyEffect: (id: string) => {
    set((state) => ({
      moneyEffects: state.moneyEffects.filter((e) => e.id !== id),
    }));
  },

  clearMoneyEffects: () => {
    set({ moneyEffects: [] });
  },

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
      // 統計データのリセット
      todayCustomerCount: 0,
      todayRevenue: 0,
      // 家賃システムのリセット
      currentRent: calculateRent(1),
      isGameOver: false,
      rentPaid: false,
      canClose: false,
      showDayEnd: false,
      isClosing: false,
      // 店拡張のリセット
      showUpgrade: false,
      lastUpgradeDay: 0,
      seatCount: SEAT_COUNT,
      tableUnlockLevel: 2, // 初期解放レベルにリセット
      // エフェクトのリセット
      moneyEffects: [],
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
  category: menu.category,
});

// Helper to create combo food from all registered menus
// お客さん1人につき全メニュー合計金額を売上とし、調理は1回
export const createComboFood = (menus: MenuItem[]): Food => {
  const totalPrice = menus.reduce((sum, menu) => sum + menu.price, 0);
  // 調理時間は登録メニューの合計
  const totalCookingTime = menus.reduce((sum, menu) => sum + menu.cookingTime, 0);

  return {
    id: `food-${++foodIdCounter}`,
    menuId: 'combo',
    name: '定食',
    iconUrl: ICONS.meal,
    price: totalPrice,
    cookingTime: totalCookingTime,
    category: 'main', // コンボはメインカテゴリ扱い
  };
};

// Helper to create order with food
export const createOrder = (customerId: string, food: Food): Order => ({
  id: `order-${++orderIdCounter}`,
  customerId,
  food,
  state: 'pending',
  cookingProgress: 0,
});

// entityStoreに循環参照用のストア参照をセット
setRestaurantStoreRef(useRestaurantStore);
