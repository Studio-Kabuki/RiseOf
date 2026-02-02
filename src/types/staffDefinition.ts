// 店員マスターデータ用の型定義
// ゲーム中の動作用のStaff型（staff.ts）とは別

export type StaffAbilityType =
  | 'none'
  | 'cooking_speed' // 調理時間倍率（value=0.5で50%短縮）
  | 'customer_speed' // 来店スピード倍率（value=1.3で30%速く）
  | 'category_bonus' // カテゴリ売上倍率（category=pizza;multiplier=1.25）
  | 'base_bonus' // ベース売上加算（category=dessert;value=3.0で+200%）
  | 'set_bonus' // セット割引：別カテゴリN種類以上で+value円（requiredCategories=2;value=50）
  | 'full_course'; // フルコース：別カテゴリN種類以上で+value円（requiredCategories=3;value=150）

export type StaffParams = Record<string, string | number>;

export interface StaffDefinition {
  id: string;
  name: string;
  iconUrl: string;
  ability: StaffAbilityType;
  params: StaffParams;
  description: string;
  cost: number; // LITコスト
}
