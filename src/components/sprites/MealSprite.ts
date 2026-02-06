import { Container, Sprite, Texture } from 'pixi.js';
import type { TableMeal } from '../../store/restaurantStore';
import type { MenuCategory } from '../../types/menu';
import { getGlobalTilesets, getTileFrame } from '../../utils/tmxRenderer';

// カテゴリに応じたタイルGIDを取得
// diner.tsx の firstGid=1 なので: gid = 1 + localTileId
const MEAL_TILE_GIDS: Record<MenuCategory, number> = {
  dessert: 743,  // tile 742
  snack: 745,    // tile 744
  main: 774,     // tile 773
};

// タイルセットからスプライトテクスチャを取得
function getMealTexture(category: MenuCategory): Texture | null {
  const gid = MEAL_TILE_GIDS[category];
  const tilesets = getGlobalTilesets();

  if (tilesets.length === 0) {
    console.warn('[MealSprite] Tilesets not loaded yet');
    return null;
  }

  const tileInfo = getTileFrame(gid, tilesets);
  if (!tileInfo) {
    console.warn(`[MealSprite] Tile not found for gid ${gid}`);
    return null;
  }

  // テクスチャの一部を切り出してスプライト用テクスチャを作成
  return new Texture({
    source: tileInfo.texture.source,
    frame: tileInfo.frame,
  });
}

export class MealSprite extends Container {
  private icon: Sprite | null = null;
  private currentCategory: MenuCategory | null = null;

  constructor(meal: TableMeal) {
    super();

    // 位置設定
    this.x = meal.position.x;
    this.y = meal.position.y;

    this.createIcon(meal.category);
    this.currentCategory = meal.category;
  }

  private createIcon(category: MenuCategory): void {
    const texture = getMealTexture(category);
    if (!texture) return;

    this.icon = new Sprite(texture);
    // タイルは16x16なのでそのままのサイズで表示
    this.icon.anchor.set(0.5);
    this.addChild(this.icon);
  }

  update(meal: TableMeal): void {
    // 位置更新
    this.x = meal.position.x;
    this.y = meal.position.y;

    // カテゴリが変わった場合はアイコンを更新
    if (this.currentCategory !== meal.category) {
      if (this.icon) {
        this.removeChild(this.icon);
        this.icon.destroy();
        this.icon = null;
      }

      this.createIcon(meal.category);
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
