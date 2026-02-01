import { Container, Graphics, Sprite } from 'pixi.js';
import type { Cook } from '../../types';

/**
 * キッチンスタッフ（コック）のスプライト
 * 調理中は頭の上に料理アイコンと円形ゲージを表示
 */
export class CookSprite extends Container {
  private body: Graphics;
  private progressRing: Graphics | null = null;
  private foodIcon: Sprite | null = null;
  private currentFoodIconUrl: string | null = null;

  constructor() {
    super();

    // コックの体（白い帽子と青いユニフォーム）
    this.body = new Graphics();
    this.drawBody();
    this.addChild(this.body);
  }

  /**
   * コックの体を描画
   */
  private drawBody(): void {
    this.body.clear();

    // 体（青いユニフォーム）
    this.body.roundRect(-10, -8, 20, 25, 5);
    this.body.fill(0x1976d2); // 青

    // 頭
    this.body.circle(0, -20, 12);
    this.body.fill(0xffccbc); // 肌色

    // コック帽（白い高い帽子）
    this.body.roundRect(-10, -42, 20, 20, 3);
    this.body.fill(0xffffff); // 白
    this.body.stroke({ width: 1, color: 0xdddddd });
  }

  /**
   * 円形進捗ゲージを描画
   * @param progress 0-1の進捗値
   */
  private drawProgressRing(progress: number): void {
    if (!this.progressRing) {
      this.progressRing = new Graphics();
      this.addChild(this.progressRing);
    }

    this.progressRing.clear();
    this.progressRing.x = 0;
    this.progressRing.y = -60; // 帽子の上

    const radius = 18;
    const lineWidth = 4;

    // 背景リング（灰色）
    this.progressRing.circle(0, 0, radius);
    this.progressRing.stroke({ width: lineWidth, color: 0x333333, alpha: 0.3 });

    // 進捗リング（オレンジ）
    if (progress > 0) {
      const startAngle = -Math.PI / 2; // 12時方向から開始
      const endAngle = startAngle + Math.PI * 2 * progress;

      this.progressRing.arc(0, 0, radius, startAngle, endAngle);
      this.progressRing.stroke({ width: lineWidth, color: 0xff9800 });
    }
  }

  /**
   * 料理アイコンを更新
   * @param iconUrl 料理のアイコンURL
   */
  private updateFoodIcon(iconUrl: string | null): void {
    if (iconUrl === this.currentFoodIconUrl) {
      return; // 同じアイコンなら更新不要
    }

    // 古いアイコンを削除
    if (this.foodIcon) {
      this.removeChild(this.foodIcon);
      this.foodIcon.destroy();
      this.foodIcon = null;
    }

    // 新しいアイコンを作成
    if (iconUrl) {
      this.foodIcon = Sprite.from(iconUrl);
      this.foodIcon.width = 24;
      this.foodIcon.height = 24;
      this.foodIcon.anchor.set(0.5);
      this.foodIcon.x = 0;
      this.foodIcon.y = -60; // 帽子の上（ゲージの中央）
      this.addChild(this.foodIcon);
    }

    this.currentFoodIconUrl = iconUrl;
  }

  /**
   * コックの状態を更新
   */
  update(cook: Cook): void {
    // 位置更新
    this.x = cook.position.x;
    this.y = cook.position.y;

    if (cook.state === 'cooking' && cook.currentFood) {
      // 調理中：料理アイコンと進捗ゲージを表示
      this.updateFoodIcon(cook.currentFood.iconUrl);
      this.drawProgressRing(cook.cookingProgress);
    } else {
      // 待機中：アイコンとゲージを非表示
      this.updateFoodIcon(null);
      if (this.progressRing) {
        this.progressRing.clear();
      }
    }
  }

  destroy(): void {
    if (this.foodIcon) {
      this.foodIcon.destroy();
    }
    if (this.progressRing) {
      this.progressRing.destroy();
    }
    this.body.destroy();
    super.destroy();
  }
}
