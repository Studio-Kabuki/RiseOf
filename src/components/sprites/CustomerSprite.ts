import { Container, Graphics, Sprite } from 'pixi.js';
import type { Customer } from '../../types';
import { ICONS } from '../../constants/game';

export class CustomerSprite extends Container {
  private body: Graphics;
  private bubble: Container | null = null;
  private bubbleIcon: Sprite | null = null;
  private currentMenuIconUrl: string | null = null;
  private progressBar: Graphics | null = null;

  constructor() {
    super();

    // 人型スプライト（シンプルな円）
    this.body = new Graphics();
    this.drawBody(0x4a90d9); // 青色
    this.addChild(this.body);
  }

  private drawBody(color: number): void {
    this.body.clear();
    // 頭
    this.body.circle(0, -20, 12);
    this.body.fill(color);
    // 体
    this.body.roundRect(-10, -8, 20, 25, 5);
    this.body.fill(color);
  }

  update(customer: Customer): void {
    // 位置更新
    this.x = customer.position.x;
    this.y = customer.position.y;

    // 状態に応じた表示
    this.updateBubble(customer);
    this.updateProgressBar(customer);
  }

  private updateBubble(customer: Customer): void {
    const shouldShowBubble =
      customer.state === 'ordering' ||
      customer.state === 'waiting' ||
      customer.state === 'waiting_for_menu';

    // メニュー待機中は?アイコン、それ以外は注文した料理のアイコン
    const menuIconUrl =
      customer.state === 'waiting_for_menu'
        ? ICONS.question
        : customer.orderedFood?.iconUrl || ICONS.meal;

    // デバッグ: 一度だけログ出力
    if (shouldShowBubble && customer.orderedFood && !this.bubble) {
      console.log('CustomerSprite: orderedFood', customer.orderedFood);
      console.log('CustomerSprite: iconUrl', menuIconUrl);
    }

    if (shouldShowBubble) {
      // 吹き出しがなければ作成
      if (!this.bubble) {
        this.bubble = new Container();
        this.bubble.y = -55;

        // 吹き出し背景
        const bg = new Graphics();
        bg.roundRect(-18, -18, 36, 36, 8);
        bg.fill(0xffffff);
        bg.stroke({ width: 2, color: 0x333333 });
        this.bubble.addChild(bg);

        this.addChild(this.bubble);
      }

      // アイコンを更新
      if (this.currentMenuIconUrl !== menuIconUrl) {
        if (this.bubbleIcon) {
          this.bubble.removeChild(this.bubbleIcon);
          this.bubbleIcon.destroy();
        }

        this.bubbleIcon = Sprite.from(menuIconUrl);
        this.bubbleIcon.width = 24;
        this.bubbleIcon.height = 24;
        this.bubbleIcon.anchor.set(0.5);
        this.bubble.addChild(this.bubbleIcon);
        this.currentMenuIconUrl = menuIconUrl;
      }
    } else {
      if (this.bubble) {
        this.removeChild(this.bubble);
        this.bubble.destroy();
        this.bubble = null;
        this.bubbleIcon = null;
        this.currentMenuIconUrl = null;
      }
    }
  }

  private updateProgressBar(customer: Customer): void {
    // 食事中はプログレスバー表示
    if (customer.state === 'eating') {
      if (!this.progressBar) {
        this.progressBar = new Graphics();
        this.progressBar.y = 25;
        this.addChild(this.progressBar);
      }

      // プログレスバー描画
      this.progressBar.clear();
      // 背景
      this.progressBar.roundRect(-15, 0, 30, 6, 3);
      this.progressBar.fill(0x333333);
      // 進捗
      const width = 28 * customer.eatingProgress;
      if (width > 0) {
        this.progressBar.roundRect(-14, 1, width, 4, 2);
        this.progressBar.fill(0x4caf50);
      }
    } else {
      if (this.progressBar) {
        this.removeChild(this.progressBar);
        this.progressBar.destroy();
        this.progressBar = null;
      }
    }
  }

  destroy(): void {
    if (this.bubble) {
      this.bubble.destroy();
    }
    if (this.progressBar) {
      this.progressBar.destroy();
    }
    super.destroy();
  }
}
