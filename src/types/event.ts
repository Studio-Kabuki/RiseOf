// イベント効果の種類
export type EventEffectType =
  | 'none'           // 効果なし
  | 'priceBonus'     // カテゴリ別価格ボーナス
  | 'salesMultiplier' // 特定メニューの売上倍率
  | 'speedMultiplier'; // 移動速度倍率

// イベント効果の対象
export type EventEffectTarget =
  | ''        // なし
  | 'snack'   // スナックカテゴリ
  | 'main'    // メインカテゴリ
  | 'dessert' // デザートカテゴリ
  | 'customer' // お客さん
  | string;   // 特定メニューID（meatloaf等）

// イベント定義
export interface GameEvent {
  id: string;
  name: string;
  description: string;
  effectType: EventEffectType;
  effectTarget: EventEffectTarget;
  effectValue: number;
}
