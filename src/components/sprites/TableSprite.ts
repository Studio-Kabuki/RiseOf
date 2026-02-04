import { Container, Sprite, Assets } from 'pixi.js';
import type { Table } from '../../types';
import tableImage from '../../assets/diner_booth_seat_32x16.png';
import chairImage from '../../assets/diner_stool_16x16.png';

// テクスチャのプリロード用Promise
let texturesLoaded: Promise<void> | null = null;

async function ensureTexturesLoaded(): Promise<void> {
  if (!texturesLoaded) {
    texturesLoaded = Assets.load([tableImage, chairImage]).then(() => {});
  }
  return texturesLoaded;
}

export class TableSprite extends Container {
  private tableSprite: Sprite | null = null;
  private chairSprites: Sprite[] = [];

  constructor(table: Table) {
    super();

    this.x = table.position.x;
    this.y = table.position.y;

    // 非同期でスプライトを初期化
    this.initSprites(table);
  }

  private async initSprites(table: Table): Promise<void> {
    await ensureTexturesLoaded();

    // テーブル本体（32x16画像、4倍に拡大して128x64に）
    const tableTexture = Assets.get(tableImage);
    this.tableSprite = new Sprite(tableTexture);
    this.tableSprite.anchor.set(0.5, 0.5);
    this.tableSprite.scale.set(4, 4); // 4倍に拡大
    this.addChild(this.tableSprite);

    // 座席（椅子画像、16x16を4倍に拡大して64x64に）
    const chairTexture = Assets.get(chairImage);
    for (const seat of table.seats) {
      const chairSprite = new Sprite(chairTexture);
      chairSprite.anchor.set(0.5, 0.5);
      chairSprite.x = seat.localPosition.x;
      chairSprite.y = seat.localPosition.y;
      chairSprite.scale.set(4, 4); // 4倍に拡大
      this.addChild(chairSprite);
      this.chairSprites.push(chairSprite);
    }
  }

  destroy(): void {
    if (this.tableSprite) {
      this.tableSprite.destroy();
    }
    for (const sprite of this.chairSprites) {
      sprite.destroy();
    }
    super.destroy();
  }
}
