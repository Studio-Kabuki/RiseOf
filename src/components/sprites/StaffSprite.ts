import { Container, Graphics, Sprite } from 'pixi.js';
import type { Staff, StaffState } from '../../types';
import { ICONS } from '../../constants/game';

export class StaffSprite extends Container {
  private body: Graphics;
  private foodSprite: Sprite | null = null;
  private currentFoodIconUrl: string | null = null;
  private stateIcon: Sprite | null = null;
  private currentStateIconUrl: string | null = null;
  // 調理中表示用
  private progressRing: Graphics | null = null;
  private cookingFoodIcon: Sprite | null = null;
  private currentCookingIconUrl: string | null = null;

  constructor() {
    super();

    // 人型スプライト（シンプルな円）緑色
    this.body = new Graphics();
    this.drawBody(0x4caf50); // 緑色
    this.addChild(this.body);
  }

  private drawBody(color: number): void {
    this.body.clear();
    // 頭
    this.body.circle(0, -10, 6);
    this.body.fill(color);
    // 体（エプロン風）
    this.body.roundRect(-5, -4, 10, 12, 2);
    this.body.fill(color);
    // エプロン
    this.body.roundRect(-4, 0, 8, 7, 1);
    this.body.fill(0xffffff);
  }

  update(staff: Staff): void {
    // 位置更新
    this.x = staff.position.x;
    this.y = staff.position.y;

    // 料理を持っているかどうか
    this.updateFoodSprite(staff);
    // 状態アイコン更新
    this.updateStateIcon(staff.state);
    // 調理中の進捗表示を更新
    this.updateCookingProgress(staff);
  }

  private updateFoodSprite(staff: Staff): void {
    // 料理を持っているのは、受け取り後（moving_to_customer, serving）のみ
    const foodIconUrl = staff.carryingFood?.iconUrl;
    const shouldShowFood =
      staff.carryingFood &&
      (staff.state === 'moving_to_customer' || staff.state === 'serving');

    if (shouldShowFood && foodIconUrl) {
      // アイコンが変わった場合は再作成
      if (this.currentFoodIconUrl !== foodIconUrl) {
        if (this.foodSprite) {
          this.removeChild(this.foodSprite);
          this.foodSprite.destroy();
        }
        this.foodSprite = Sprite.from(foodIconUrl);
        this.foodSprite.width = 12;
        this.foodSprite.height = 12;
        this.foodSprite.anchor.set(0.5);
        this.foodSprite.x = 9;
        this.foodSprite.y = -2;
        this.addChild(this.foodSprite);
        this.currentFoodIconUrl = foodIconUrl;
      }
    } else {
      if (this.foodSprite) {
        this.removeChild(this.foodSprite);
        this.foodSprite.destroy();
        this.foodSprite = null;
        this.currentFoodIconUrl = null;
      }
    }
  }

  private getStateIconUrl(state: StaffState): string | null {
    switch (state) {
      case 'moving_to_kitchen':
        return ICONS.staff.movingToKitchen;
      case 'picking_food':
        return ICONS.staff.pickingFood;
      case 'moving_to_customer':
        return ICONS.staff.delivering;
      case 'serving':
        return ICONS.staff.serving;
      case 'idle':
      default:
        return null; // 定位置に帰る時はアイコンなし
    }
  }

  private updateStateIcon(state: StaffState): void {
    const iconUrl = this.getStateIconUrl(state);

    // 同じアイコンなら更新しない
    if (iconUrl === this.currentStateIconUrl) {
      return;
    }

    // 古いアイコンを削除
    if (this.stateIcon) {
      this.removeChild(this.stateIcon);
      this.stateIcon.destroy();
      this.stateIcon = null;
    }

    // 新しいアイコンを作成
    if (iconUrl) {
      this.stateIcon = Sprite.from(iconUrl);
      this.stateIcon.width = 10;
      this.stateIcon.height = 10;
      this.stateIcon.anchor.set(0.5);
      this.stateIcon.x = 0;
      this.stateIcon.y = -22; // 頭の上
      this.addChild(this.stateIcon);
    }

    this.currentStateIconUrl = iconUrl;
  }

  /**
   * 調理中の進捗表示を更新
   */
  private updateCookingProgress(staff: Staff): void {
    if (staff.state === 'cooking' && staff.currentFood) {
      // 調理中：料理アイコンと進捗ゲージを表示
      this.updateCookingFoodIcon(staff.currentFood.iconUrl);
      this.drawProgressRing(staff.cookingProgress);
    } else {
      // 調理中でない：アイコンとゲージを非表示
      this.updateCookingFoodIcon(null);
      if (this.progressRing) {
        this.progressRing.clear();
      }
    }
  }

  /**
   * 調理中の料理アイコンを更新
   */
  private updateCookingFoodIcon(iconUrl: string | null): void {
    if (iconUrl === this.currentCookingIconUrl) {
      return; // 同じアイコンなら更新不要
    }

    // 古いアイコンを削除
    if (this.cookingFoodIcon) {
      this.removeChild(this.cookingFoodIcon);
      this.cookingFoodIcon.destroy();
      this.cookingFoodIcon = null;
    }

    // 新しいアイコンを作成
    if (iconUrl) {
      this.cookingFoodIcon = Sprite.from(iconUrl);
      this.cookingFoodIcon.width = 12;
      this.cookingFoodIcon.height = 12;
      this.cookingFoodIcon.anchor.set(0.5);
      this.cookingFoodIcon.x = 0;
      this.cookingFoodIcon.y = -30; // 頭の上（ゲージの中央）
      this.addChild(this.cookingFoodIcon);
    }

    this.currentCookingIconUrl = iconUrl;
  }

  /**
   * 円形進捗ゲージを描画
   */
  private drawProgressRing(progress: number): void {
    if (!this.progressRing) {
      this.progressRing = new Graphics();
      this.addChild(this.progressRing);
    }

    this.progressRing.clear();
    this.progressRing.x = 0;
    this.progressRing.y = -30; // 頭の上

    const radius = 9;
    const lineWidth = 2;

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

  destroy(): void {
    if (this.foodSprite) {
      this.foodSprite.destroy();
    }
    if (this.stateIcon) {
      this.stateIcon.destroy();
    }
    if (this.progressRing) {
      this.progressRing.destroy();
    }
    if (this.cookingFoodIcon) {
      this.cookingFoodIcon.destroy();
    }
    super.destroy();
  }
}
