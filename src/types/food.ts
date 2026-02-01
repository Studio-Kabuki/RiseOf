/**
 * 料理インスタンス
 * MenuItemから生成され、注文・調理・配達で使用される
 */
export interface Food {
  id: string;
  menuId: string;
  name: string;
  iconUrl: string;
  price: number;
  cookingTime: number; // 調理時間（秒）
}
