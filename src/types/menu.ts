// メニューカテゴリの種類
export type MenuCategory = 'snack' | 'main' | 'dessert';

// カテゴリの表示情報
export const CATEGORY_INFO: Record<MenuCategory, { label: string; color: string; icon: string }> = {
  snack: { label: 'スナック', color: '#FFA726', icon: '🍟' },
  main: { label: 'メイン', color: '#EF5350', icon: '🍖' },
  dessert: { label: 'デザート', color: '#AB47BC', icon: '🍨' },
};

// メニューアイテムの型定義
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cookingTime: number; // 調理時間（秒）- 廃止予定
  iconUrl: string;
  category: MenuCategory;       // メインカテゴリ（スナック・メイン・デザート）
  hiddenCategory?: string;      // 隠しカテゴリ（将来のシナジー用）
  description?: string;         // メニューの説明
}

// メニューの状態
export type MenuState = 'locked' | 'available';
