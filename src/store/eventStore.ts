import { create } from 'zustand';
import type { GameEvent } from '../types/event';
import { loadEventsFromCSV, getEventPool } from '../data/eventLoader';

interface EventState {
  // 現在のイベント
  currentEvent: GameEvent | null;

  // 初期化済みフラグ
  initialized: boolean;

  // イベントを読み込む
  loadEvents: () => Promise<void>;

  // 新しい日のイベントをランダムに選択
  selectRandomEvent: () => void;

  // 現在のイベントがカテゴリに対して価格ボーナスを持つか（旧式、互換性のため残す）
  getPriceBonus: (category: string) => number;

  // 特定メニューIDの売上倍率を取得
  getSalesMultiplier: (menuId: string) => number;

  // お客さんの移動速度倍率を取得
  getCustomerSpeedMultiplier: () => number;

  // カテゴリの好み確率ブーストを取得（流行イベント用）
  getPreferenceBoost: (category: string) => number;

  // リセット
  reset: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  currentEvent: null,
  initialized: false,

  loadEvents: async () => {
    await loadEventsFromCSV();
    set({ initialized: true });
  },

  selectRandomEvent: () => {
    const events = getEventPool();
    if (events.length === 0) {
      set({ currentEvent: null });
      return;
    }
    const index = Math.floor(Math.random() * events.length);
    set({ currentEvent: events[index] });
  },

  getPriceBonus: (category: string) => {
    const { currentEvent } = get();
    if (!currentEvent) return 0;
    if (currentEvent.effectType === 'priceBonus' && currentEvent.effectTarget === category) {
      return currentEvent.effectValue;
    }
    return 0;
  },

  getSalesMultiplier: (menuId: string) => {
    const { currentEvent } = get();
    if (!currentEvent) return 1;
    if (currentEvent.effectType === 'salesMultiplier' && currentEvent.effectTarget === menuId) {
      return currentEvent.effectValue;
    }
    return 1;
  },

  getCustomerSpeedMultiplier: () => {
    const { currentEvent } = get();
    if (!currentEvent) return 1;
    if (currentEvent.effectType === 'speedMultiplier' && currentEvent.effectTarget === 'customer') {
      return currentEvent.effectValue;
    }
    return 1;
  },

  getPreferenceBoost: (category: string) => {
    const { currentEvent } = get();
    if (!currentEvent) return 1;
    if (currentEvent.effectType === 'preferenceBoost' && currentEvent.effectTarget === category) {
      return currentEvent.effectValue;
    }
    return 1;
  },

  reset: () => {
    set({ currentEvent: null });
  },
}));
