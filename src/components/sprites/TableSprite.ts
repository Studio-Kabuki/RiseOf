import { Container, Graphics } from 'pixi.js';
import type { Table } from '../../types';

export class TableSprite extends Container {
  private tableGraphics: Graphics;
  private seatGraphics: Graphics[];

  constructor(table: Table) {
    super();

    this.x = table.position.x;
    this.y = table.position.y;

    // テーブル本体
    this.tableGraphics = new Graphics();
    this.tableGraphics.roundRect(-30, -25, 60, 50, 8);
    this.tableGraphics.fill(0x8b4513); // 茶色
    this.tableGraphics.stroke({ width: 2, color: 0x5d3a1a });
    this.addChild(this.tableGraphics);

    // 座席
    this.seatGraphics = [];
    for (const seat of table.seats) {
      const seatG = new Graphics();
      seatG.circle(seat.localPosition.x, seat.localPosition.y, 15);
      seatG.fill(0xd4a574); // 薄茶色
      seatG.stroke({ width: 1, color: 0x8b4513 });
      this.addChild(seatG);
      this.seatGraphics.push(seatG);
    }
  }

  destroy(): void {
    this.tableGraphics.destroy();
    for (const g of this.seatGraphics) {
      g.destroy();
    }
    super.destroy();
  }
}
