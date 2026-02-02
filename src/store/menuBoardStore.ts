import { create } from 'zustand';
import type { MenuItem } from '../types/menu';
import type { StaffDefinition } from '../types/staffDefinition';

// シナジー発動イベント
export interface SynergyEvent {
  staffId: string;
  staffName: string;
  staffIcon: string;
  bonusText: string; // 例: "+50円" や "×2倍"
  triggeredBy: 'menu' | 'category_count'; // メニュー追加時 or カテゴリ数達成時
  menuIndex?: number; // どのメニューで発動したか
  priority?: number; // 演出優先度（高い方が先に演出）
}

// アニメーション状態
export type AnimationPhase =
  | 'idle' // 表示していない
  | 'showing_menu' // メニューを1つずつ表示中
  | 'showing_synergy' // シナジー演出中
  | 'showing_total' // 客単価演出中
  | 'complete'; // 全て表示完了

interface MenuBoardState {
  // 表示状態
  isOpen: boolean;
  // アニメーション状態
  animationPhase: AnimationPhase;
  // 表示済みメニューのインデックス（0から順番に増える）
  displayedMenuCount: number;
  // 現在表示中のシナジーイベント（キューとして使用）
  pendingSynergyEvents: SynergyEvent[];
  // 現在演出中のシナジー
  currentSynergy: SynergyEvent | null;
  // カテゴリ達成状態（フルコース等の判定用）
  achievedCategoryBonuses: Set<number>; // 達成済みのrequiredCategories

  // Actions
  openBoard: () => void;
  closeBoard: () => void;
  // 1日開始時の演出を開始
  startDayAnimation: (menus: MenuItem[], staff: StaffDefinition[]) => void;
  // 次のメニューを表示
  showNextMenu: () => void;
  // シナジー演出を追加
  addSynergyEvent: (event: SynergyEvent) => void;
  // 次のシナジーを演出
  showNextSynergy: () => void;
  // シナジー演出完了
  completeSynergy: () => void;
  // メニュー表示完了 → 客単価演出へ
  completeAnimation: () => void;
  // 客単価演出完了 → 完了状態へ
  completeTotalAnimation: () => void;
  // リセット
  reset: () => void;
}

export const useMenuBoardStore = create<MenuBoardState>((set, get) => ({
  isOpen: false,
  animationPhase: 'idle',
  displayedMenuCount: 0,
  pendingSynergyEvents: [],
  currentSynergy: null,
  achievedCategoryBonuses: new Set(),

  openBoard: () => set({ isOpen: true }),
  closeBoard: () => set({ isOpen: false }),

  startDayAnimation: (_menus: MenuItem[], _staff: StaffDefinition[]) => {
    // アニメーション状態を初期化
    set({
      isOpen: true,
      animationPhase: 'showing_menu',
      displayedMenuCount: 0,
      pendingSynergyEvents: [],
      currentSynergy: null,
      achievedCategoryBonuses: new Set(),
    });
  },

  showNextMenu: () => {
    set((state) => ({
      displayedMenuCount: state.displayedMenuCount + 1,
    }));
  },

  addSynergyEvent: (event: SynergyEvent) => {
    set((state) => ({
      pendingSynergyEvents: [...state.pendingSynergyEvents, event],
    }));
  },

  showNextSynergy: () => {
    const { pendingSynergyEvents } = get();
    if (pendingSynergyEvents.length === 0) {
      set({ animationPhase: 'showing_menu', currentSynergy: null });
      return;
    }

    const [next, ...rest] = pendingSynergyEvents;
    set({
      animationPhase: 'showing_synergy',
      currentSynergy: next,
      pendingSynergyEvents: rest,
    });
  },

  completeSynergy: () => {
    const { pendingSynergyEvents } = get();
    if (pendingSynergyEvents.length > 0) {
      // まだシナジーがある場合は次を表示
      get().showNextSynergy();
    } else {
      // シナジーがなければメニュー表示に戻る
      set({ animationPhase: 'showing_menu', currentSynergy: null });
    }
  },

  completeAnimation: () => {
    set({ animationPhase: 'showing_total' });
  },

  completeTotalAnimation: () => {
    set({ animationPhase: 'complete' });
  },

  reset: () => {
    set({
      isOpen: false,
      animationPhase: 'idle',
      displayedMenuCount: 0,
      pendingSynergyEvents: [],
      currentSynergy: null,
      achievedCategoryBonuses: new Set(),
    });
  },
}));
