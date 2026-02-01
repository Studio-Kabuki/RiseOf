import { Container, Graphics, Text } from 'pixi.js';
import { REGISTER_POSITION, REGISTER_SPACING } from '../../constants/game';

export class RegisterSprite extends Container {
  private spots: Graphics[] = [];

  constructor(maxStaffCount: number = 4) {
    super();

    // レジカウンター背景
    const counter = new Graphics();
    const counterWidth = maxStaffCount * REGISTER_SPACING + 20;
    counter.roundRect(
      REGISTER_POSITION.x - 30,
      REGISTER_POSITION.y - 40,
      counterWidth,
      60,
      8
    );
    counter.fill(0x8d6e63); // 茶色
    counter.stroke({ width: 2, color: 0x5d4037 });
    this.addChild(counter);

    // レジラベル
    const label = new Text({
      text: 'レジ',
      style: { fontSize: 12, fill: 0xffffff },
    });
    label.x = REGISTER_POSITION.x - 20;
    label.y = REGISTER_POSITION.y - 55;
    this.addChild(label);

    // 店員の定位置スポット（丸）
    for (let i = 0; i < maxStaffCount; i++) {
      const spot = new Graphics();
      const x = REGISTER_POSITION.x + i * REGISTER_SPACING;
      const y = REGISTER_POSITION.y;

      // 丸い待機スポット
      spot.circle(x, y, 18);
      spot.fill({ color: 0xbcaaa4, alpha: 0.5 });
      spot.stroke({ width: 2, color: 0x8d6e63, alpha: 0.8 });

      this.addChild(spot);
      this.spots.push(spot);
    }
  }

  destroy(): void {
    for (const spot of this.spots) {
      spot.destroy();
    }
    super.destroy();
  }
}
