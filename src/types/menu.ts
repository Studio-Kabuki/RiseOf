// メニューアイテムの型定義
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cookingTime: number; // 調理時間（秒）
  iconUrl: string;
}

// メニューの状態
export type MenuState = 'locked' | 'available';
