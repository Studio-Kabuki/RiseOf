/**
 * シーズニング（メニュー強化）の型定義
 */

// シーズニング効果の種類
export type SeasoningEffectType =
  | 'sales_multiplier'    // 売上倍率（例：×1.5）
  | 'stacking_bonus'      // 購入ごとに加算（例：+1ずつ）
  | 'all_categories'      // 全カテゴリを持つ
  | 'category_bonus';     // 特定カテゴリでボーナス

// シーズニング効果のパラメータ
export interface SeasoningParams {
  multiplier?: number;      // 売上倍率
  stackValue?: number;      // スタック時の加算値
  categoryBonus?: {         // カテゴリボーナス
    category: string;       // 対象カテゴリ
    extraMultiplier: number; // 追加倍率
  };
}

// シーズニング定義
export interface SeasoningDefinition {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  cost: number;             // LITコスト
  effectType: SeasoningEffectType;
  params: SeasoningParams;
}

// メニューに適用されたシーズニングの状態
export interface AppliedSeasoning {
  seasoningId: string;
  menuId: string;
  stackCount: number;       // stacking_bonus用のカウンター
}
