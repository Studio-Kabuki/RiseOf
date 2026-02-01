import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Kitchen } from '../../types';

/**
 * キッチンスプライト
 * キッチン本体と完成した料理のアイコンを表示
 * 調理中の進捗表示はCookSpriteが担当
 */
export class KitchenSprite extends Container {
  private kitchenGraphics: Graphics;
  private readyIcons: Sprite[] = [];

  constructor(kitchen: Kitchen) {
    super();

    this.x = kitchen.position.x;
    this.y = kitchen.position.y;

    // キッチン本体
    this.kitchenGraphics = new Graphics();
    this.kitchenGraphics.roundRect(-40, -30, 80, 60, 5);
    this.kitchenGraphics.fill(0x607d8b); // グレー
    this.kitchenGraphics.stroke({ width: 2, color: 0x455a64 });
    this.addChild(this.kitchenGraphics);

    // キッチンラベル
    const label = new Text({
      text: 'Kitchen',
      style: { fontSize: 12, fill: 0xffffff },
    });
    label.anchor.set(0.5);
    label.y = -40;
    this.addChild(label);
  }

  update(kitchen: Kitchen): void {
    // 既存のアイコンをクリア
    for (const icon of this.readyIcons) {
      this.removeChild(icon);
      icon.destroy();
    }
    this.readyIcons = [];

    // 完成した料理を表示（各注文のFood.iconUrlを使用）
    let xOffset = -30;
    for (let i = 0; i < kitchen.readyFoods.length; i++) {
      const orderId = kitchen.readyFoods[i];
      const order = kitchen.orders.find((o) => o.id === orderId);
      const iconUrl = order?.food.iconUrl || 'https://img.icons8.com/fluency/48/rice-bowl.png';
      const icon = Sprite.from(iconUrl);
      icon.width = 20;
      icon.height = 20;
      icon.anchor.set(0.5);
      icon.x = xOffset + i * 24;
      icon.y = 25;
      this.addChild(icon);
      this.readyIcons.push(icon);
    }
  }

  destroy(): void {
    for (const icon of this.readyIcons) {
      icon.destroy();
    }
    this.kitchenGraphics.destroy();
    super.destroy();
  }
}
