import { Container, Graphics, Text } from 'pixi.js';
import type { Position } from '../../types';

export class EntranceSprite extends Container {
  constructor(position: Position) {
    super();

    this.x = position.x;
    this.y = position.y;

    // 入口マーク
    const graphics = new Graphics();
    graphics.roundRect(-20, -30, 40, 60, 5);
    graphics.fill(0x795548); // 茶色
    graphics.stroke({ width: 2, color: 0x5d4037 });
    this.addChild(graphics);

    // ドアノブ
    const knob = new Graphics();
    knob.circle(12, 0, 4);
    knob.fill(0xffd700); // 金色
    this.addChild(knob);

    // ラベル
    const label = new Text({
      text: '入口',
      style: { fontSize: 10, fill: 0xffffff },
    });
    label.anchor.set(0.5);
    label.y = -40;
    this.addChild(label);
  }
}
