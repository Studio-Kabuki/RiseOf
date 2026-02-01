import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Kitchen, Order } from '../../types';

export class KitchenSprite extends Container {
  private kitchenGraphics: Graphics;
  private progressBars: Map<string, Graphics> = new Map();
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
    // 既存のプログレスバーをクリア
    for (const [_, bar] of this.progressBars) {
      this.removeChild(bar);
      bar.destroy();
    }
    this.progressBars.clear();

    // 既存のアイコンをクリア
    for (const icon of this.readyIcons) {
      this.removeChild(icon);
      icon.destroy();
    }
    this.readyIcons = [];

    // 調理中の注文を表示
    let yOffset = -15;
    for (const order of kitchen.orders) {
      if (order.state === 'cooking') {
        const bar = this.createProgressBar(order, yOffset);
        this.addChild(bar);
        this.progressBars.set(order.id, bar);
        yOffset += 15;
      }
    }

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

  private createProgressBar(order: Order, yOffset: number): Graphics {
    const bar = new Graphics();
    bar.y = yOffset;

    // 背景
    bar.roundRect(-25, 0, 50, 8, 4);
    bar.fill(0x333333);

    // 進捗
    const width = 48 * order.cookingProgress;
    if (width > 0) {
      bar.roundRect(-24, 1, width, 6, 3);
      bar.fill(0xff9800); // オレンジ
    }

    return bar;
  }

  destroy(): void {
    for (const [_, bar] of this.progressBars) {
      bar.destroy();
    }
    for (const icon of this.readyIcons) {
      icon.destroy();
    }
    this.kitchenGraphics.destroy();
    super.destroy();
  }
}
