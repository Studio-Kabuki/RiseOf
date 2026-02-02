// 特殊能力の種類
export type AbilityType =
  | 'none'           // 能力なし（ミラノ風ドリア）
  | 'pizza_synergy'  // ピザカテゴリのシナジー（ソーセージピッツァ）
  | 'per_customer'   // 提供人数ごとに増加（イタリアンプリン）
  | 'lit_chance';    // 確率でLIT獲得（辛辛チキン）

// メニューパラメータの型定義（可変長引数用）
export type MenuParams = Record<string, string | number>;

// メニューアイテムの型定義
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cookingTime: number; // 調理時間（秒）- 廃止予定
  iconUrl: string;
  ability?: AbilityType;  // 特殊能力の種類
  params?: MenuParams;    // 可変長パラメータ（例: { value: 30, multiplier: 20 }）
  description?: string;   // 能力の説明（\nで改行対応）
}

// メニューの状態
export type MenuState = 'locked' | 'available';
