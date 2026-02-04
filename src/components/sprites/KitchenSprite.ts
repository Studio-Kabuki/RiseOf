import { Container, Sprite, Text, Assets } from 'pixi.js';
import type { Kitchen } from '../../types';
import { ICONS } from '../../constants/game';
import counterImage from '../../assets/diner_counter_48x32.png';

// テクスチャのプリロード用Promise
let textureLoaded: Promise<void> | null = null;

async function ensureTextureLoaded(): Promise<void> {
  if (!textureLoaded) {
    textureLoaded = Assets.load(counterImage).then(() => {});
  }
  return textureLoaded;
}

/**
 * キッチンスプライト
 * キッチン本体と完成した料理のアイコンを表示
 * 調理中の進捗表示はStaffSpriteが担当（統合スタッフシステム）
 */
export class KitchenSprite extends Container {
  private counterSprite: Sprite | null = null;
  private readyIcons: Sprite[] = [];

  constructor(kitchen: Kitchen) {
    super();

    this.x = kitchen.position.x;
    this.y = kitchen.position.y;

    // 非同期でスプライトを初期化
    this.initSprite();

    // キッチンラベル
    const label = new Text({
      text: 'Kitchen',
      style: { fontSize: 12, fill: 0xffffff },
    });
    label.anchor.set(0.5);
    label.y = -50;
    this.addChild(label);
  }

  private async initSprite(): Promise<void> {
    await ensureTextureLoaded();

    const texture = Assets.get(counterImage);
    this.counterSprite = new Sprite(texture);
    this.counterSprite.anchor.set(0.5, 0.5);
    this.counterSprite.scale.set(4, 4); // 4倍に拡大
    this.addChildAt(this.counterSprite, 0);
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
      const iconUrl = order?.food.iconUrl || ICONS.meal;
      const icon = Sprite.from(iconUrl);
      icon.width = 20;
      icon.height = 20;
      icon.anchor.set(0.5);
      icon.x = xOffset + i * 24;
      icon.y = 40;
      this.addChild(icon);
      this.readyIcons.push(icon);
    }
  }

  destroy(): void {
    for (const icon of this.readyIcons) {
      icon.destroy();
    }
    if (this.counterSprite) {
      this.counterSprite.destroy();
    }
    super.destroy();
  }
}
