// リソース（トークン）2種類のみ
export type Resources = {
  money: number;  // お金 💰
  lit: number;    // LIT 🔥
};

// 店舗の状態
export type ShopStatus = 'locked' | 'vacant' | 'owned';

// メニューの属性
export type MenuAttribute = 'pasta' | 'sweets' | 'meat' | 'drink' | 'none';

// スロットに入れるアイテム
export type SlotItem = {
  facilityId: string;
};

// 人材の効果タイプ
export type StaffEffectType =
  | 'shop_money_mult'      // その店の獲得ゴールド倍率
  | 'attribute_money_mult' // 特定属性のゴールド倍率
  | 'shop_lit_mult'        // その店のLIT倍率
  | 'attribute_lit_mult';  // 特定属性のLIT倍率

// 人材の定義
export type StaffDef = {
  id: string;
  name: string;
  icon: string;
  effectType: StaffEffectType;
  effectValue: number;        // 倍率（1.1 = 10%アップ）
  targetAttribute?: MenuAttribute; // 属性特攻の場合
  rarity: 'common' | 'rare' | 'epic';
};

// 店舗に配置された人材
export type StaffSlot = {
  staffId: string;
} | null;

// 店舗
export type Shop = {
  id: string;
  name: string;
  status: ShopStatus;
  unlockCost: number;
  slots: (SlotItem | null)[];
  staff: StaffSlot;  // 人材スロット（1つ）
};

// 施設の定義
export type FacilityDef = {
  id: string;
  name: string;
  icon: string;  // Icon8のURL
  income: Partial<Resources>;  // 毎ターン収入
  rarity: 'common' | 'rare' | 'epic';
  attribute: MenuAttribute;  // メニュー属性
};
