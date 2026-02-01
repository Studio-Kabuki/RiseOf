import { Container, Graphics, Text } from 'pixi.js';
import type { Staff } from '../../types';

export class StaffSprite extends Container {
  private body: Graphics;
  private foodIcon: Text | null = null;

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
    this.updateFoodIcon(staff);
  }

  private updateFoodIcon(staff: Staff): void {
    if (staff.carryingFoodId && staff.state !== 'idle') {
      if (!this.foodIcon) {
        this.foodIcon = new Text({
          text: '🍚',
          style: { fontSize: 16 },
        });
        this.foodIcon.anchor.set(0.5);
        this.foodIcon.x = 15;
        this.foodIcon.y = -10;
        this.addChild(this.foodIcon);
      }
    } else {
      if (this.foodIcon) {
        this.removeChild(this.foodIcon);
        this.foodIcon.destroy();
        this.foodIcon = null;
      }
    }
  }

  destroy(): void {
    if (this.foodIcon) {
      this.foodIcon.destroy();
    }
    super.destroy();
  }
}
