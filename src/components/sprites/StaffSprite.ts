import { Container, Graphics, Sprite } from 'pixi.js';
import type { Staff, StaffState } from '../../types';
import { ICONS } from '../../constants/game';

export class StaffSprite extends Container {
  private body: Graphics;
  private foodSprite: Sprite | null = null;
  private currentFoodIconUrl: string | null = null;
  private stateIcon: Sprite | null = null;
  private currentStateIconUrl: string | null = null;

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
    this.body.circle(0, -20, 12);
    this.body.fill(color);
    // 体（エプロン風）
    this.body.roundRect(-10, -8, 20, 25, 5);
    this.body.fill(color);
    // エプロン
    this.body.roundRect(-8, 0, 16, 15, 3);
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
        this.foodSprite.width = 24;
        this.foodSprite.height = 24;
        this.foodSprite.anchor.set(0.5);
        this.foodSprite.x = 18;
        this.foodSprite.y = -5;
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
      this.stateIcon.width = 20;
      this.stateIcon.height = 20;
      this.stateIcon.anchor.set(0.5);
      this.stateIcon.x = 0;
      this.stateIcon.y = -45; // 頭の上
      this.addChild(this.stateIcon);
    }

    this.currentStateIconUrl = iconUrl;
  }

  destroy(): void {
    if (this.foodSprite) {
      this.foodSprite.destroy();
    }
    if (this.stateIcon) {
      this.stateIcon.destroy();
    }
    super.destroy();
  }
}
