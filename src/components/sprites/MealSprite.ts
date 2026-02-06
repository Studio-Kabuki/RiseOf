import { Container, Sprite } from 'pixi.js';
import type { TableMeal } from '../../store/restaurantStore';
import type { MenuCategory } from '../../types/menu';
import { ICONS } from '../../constants/game';

// カテゴリに応じたアイコンURLを取得
const getMealIconUrl = (category: MenuCategory): string => {
  return ICONS.tableMeal[category] || ICONS.meal;
};

export class MealSprite extends Container {
  private icon: Sprite;
  private currentCategory: MenuCategory | null = null;

  constructor(meal: TableMeal) {
    super();

    // 位置設定
    this.x = meal.position.x;
    this.y = meal.position.y;

    // アイコンスプライト作成
    const iconUrl = getMealIconUrl(meal.category);
    this.icon = Sprite.from(iconUrl);
    this.icon.width = 12;
    this.icon.height = 12;
    this.icon.anchor.set(0.5);
    this.addChild(this.icon);

    this.currentCategory = meal.category;
  }

  update(meal: TableMeal): void {
    // 位置更新
    this.x = meal.position.x;
    this.y = meal.position.y;

    // カテゴリが変わった場合はアイコンを更新
    if (this.currentCategory !== meal.category) {
      const iconUrl = getMealIconUrl(meal.category);
      this.removeChild(this.icon);
      this.icon.destroy();

      this.icon = Sprite.from(iconUrl);
      this.icon.width = 12;
      this.icon.height = 12;
      this.icon.anchor.set(0.5);
      this.addChild(this.icon);

      this.currentCategory = meal.category;
    }
  }

  destroy(): void {
    if (this.icon) {
      this.icon.destroy();
    }
    super.destroy();
  }
}
