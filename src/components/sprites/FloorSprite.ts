import { TilingSprite, Assets, Texture } from 'pixi.js';
import floorImage from '../../assets/diner_floor_16x16.png';

/**
 * 床タイルスプライト
 * 16x16のタイル画像をループで敷き詰める
 */
export class FloorSprite extends TilingSprite {
  private static texturePromise: Promise<Texture> | null = null;

  private constructor(texture: Texture, width: number, height: number) {
    super({ texture, width, height });
    // タイルを5倍に拡大
    this.tileScale.set(5, 5);
    // 色を薄くする（透明度を下げる）
    this.alpha = 0.7;
  }

  /**
   * 床スプライトを非同期で作成
   */
  static async create(width: number, height: number): Promise<FloorSprite> {
    // テクスチャをキャッシュしてロード
    if (!FloorSprite.texturePromise) {
      FloorSprite.texturePromise = Assets.load(floorImage);
    }
    const texture = await FloorSprite.texturePromise;
    return new FloorSprite(texture, width, height);
  }
}
