/**
 * TMXレンダラー
 * @pixi/tilemapを使用してTiledマップを描画
 */

import { Container, Assets, Texture, Rectangle } from 'pixi.js';
import { CompositeTilemap } from '@pixi/tilemap';

// タイルセット情報
interface TilesetData {
  firstGid: number;
  name: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  tileCount: number;
  imageUrl: string;
  texture?: Texture;
}

// チャンク情報
interface ChunkData {
  x: number;
  y: number;
  width: number;
  height: number;
  tiles: number[];
}

// レイヤー情報
interface LayerData {
  type: 'layer';
  id: number;
  name: string;
  class?: string;
  visible: boolean;
  offsetX: number;
  offsetY: number;
  chunks: ChunkData[];
}

// グループ情報
interface GroupData {
  type: 'group';
  id: number;
  name: string;
  class?: string;
  visible: boolean;
  offsetX: number;
  offsetY: number;
  children: TmxChild[];
}

// レイヤーまたはグループ
type TmxChild = LayerData | GroupData;

// TMXマップ全体のデータ
export interface TmxRenderData {
  tileWidth: number;
  tileHeight: number;
  tilesets: TilesetData[];
  children: TmxChild[];
}

// タイルセットをパース
async function parseTilesetFile(tsxUrl: string, firstGid: number): Promise<TilesetData> {
  const response = await fetch(tsxUrl);
  const text = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  const tilesetEl = doc.querySelector('tileset');
  if (!tilesetEl) {
    throw new Error('Invalid tileset file');
  }

  const name = tilesetEl.getAttribute('name') || '';
  const tileWidth = parseInt(tilesetEl.getAttribute('tilewidth') || '16', 10);
  const tileHeight = parseInt(tilesetEl.getAttribute('tileheight') || '16', 10);
  const columns = parseInt(tilesetEl.getAttribute('columns') || '1', 10);
  const tileCount = parseInt(tilesetEl.getAttribute('tilecount') || '0', 10);

  const imageEl = doc.querySelector('image');
  const imageSource = imageEl?.getAttribute('source') || '';
  const baseUrl = tsxUrl.substring(0, tsxUrl.lastIndexOf('/') + 1);
  const imageUrl = baseUrl + imageSource;

  return {
    firstGid,
    name,
    tileWidth,
    tileHeight,
    columns,
    tileCount,
    imageUrl,
  };
}

// チャンクデータをパース
function parseChunk(chunkEl: Element): ChunkData {
  const x = parseInt(chunkEl.getAttribute('x') || '0', 10);
  const y = parseInt(chunkEl.getAttribute('y') || '0', 10);
  const width = parseInt(chunkEl.getAttribute('width') || '16', 10);
  const height = parseInt(chunkEl.getAttribute('height') || '16', 10);

  const csvText = chunkEl.textContent || '';
  const tiles = csvText
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  return { x, y, width, height, tiles };
}

// レイヤーをパース
function parseLayer(layerEl: Element, parentOffsetX: number, parentOffsetY: number): LayerData {
  const id = parseInt(layerEl.getAttribute('id') || '0', 10);
  const name = layerEl.getAttribute('name') || '';
  const layerClass = layerEl.getAttribute('class') || undefined;
  const visible = layerEl.getAttribute('visible') !== '0';
  const offsetX = parseFloat(layerEl.getAttribute('offsetx') || '0') + parentOffsetX;
  const offsetY = parseFloat(layerEl.getAttribute('offsety') || '0') + parentOffsetY;

  const chunks: ChunkData[] = [];
  const chunkEls = layerEl.querySelectorAll(':scope > data > chunk');
  for (const chunkEl of chunkEls) {
    chunks.push(parseChunk(chunkEl));
  }

  return { type: 'layer', id, name, class: layerClass, visible, offsetX, offsetY, chunks };
}

// グループをパース（再帰的）
function parseGroup(groupEl: Element, parentOffsetX: number, parentOffsetY: number): GroupData {
  const id = parseInt(groupEl.getAttribute('id') || '0', 10);
  const name = groupEl.getAttribute('name') || '';
  const groupClass = groupEl.getAttribute('class') || undefined;
  const visible = groupEl.getAttribute('visible') !== '0';
  const offsetX = parseFloat(groupEl.getAttribute('offsetx') || '0') + parentOffsetX;
  const offsetY = parseFloat(groupEl.getAttribute('offsety') || '0') + parentOffsetY;

  const children: TmxChild[] = [];

  for (const child of groupEl.children) {
    if (child.tagName === 'layer') {
      children.push(parseLayer(child, offsetX, offsetY));
    } else if (child.tagName === 'group') {
      children.push(parseGroup(child, offsetX, offsetY));
    }
  }

  return { type: 'group', id, name, class: groupClass, visible, offsetX, offsetY, children };
}

// TMXファイルをパースしてレンダリングデータを取得
export async function parseTmxForRendering(tmxUrl: string): Promise<TmxRenderData> {
  const response = await fetch(tmxUrl);
  const text = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  const mapEl = doc.querySelector('map');
  if (!mapEl) {
    throw new Error('Invalid TMX file: no map element');
  }

  const tileWidth = parseInt(mapEl.getAttribute('tilewidth') || '16', 10);
  const tileHeight = parseInt(mapEl.getAttribute('tileheight') || '16', 10);

  // タイルセットをパース
  const tilesets: TilesetData[] = [];
  const tilesetEls = doc.querySelectorAll('tileset');
  const baseUrl = tmxUrl.substring(0, tmxUrl.lastIndexOf('/') + 1);

  for (const tilesetEl of tilesetEls) {
    const source = tilesetEl.getAttribute('source');
    const firstGid = parseInt(tilesetEl.getAttribute('firstgid') || '1', 10);
    if (source) {
      const tsxUrl = baseUrl + source;
      const tileset = await parseTilesetFile(tsxUrl, firstGid);
      tilesets.push(tileset);
    }
  }

  // レイヤーとグループを順序通りにパース
  const children: TmxChild[] = [];

  for (const child of mapEl.children) {
    if (child.tagName === 'layer') {
      children.push(parseLayer(child, 0, 0));
    } else if (child.tagName === 'group') {
      children.push(parseGroup(child, 0, 0));
    }
  }

  return { tileWidth, tileHeight, tilesets, children };
}

// タイルセット画像をロード
export async function loadTilesetTextures(tilesets: TilesetData[]): Promise<void> {
  for (const tileset of tilesets) {
    try {
      tileset.texture = await Assets.load(tileset.imageUrl);
      console.log(`[TMX] Loaded tileset: ${tileset.name} from ${tileset.imageUrl}`);
    } catch (error) {
      console.warn(`[TMX] Failed to load tileset ${tileset.name}:`, error);
    }
  }
}

// GIDに対応するタイルセットを取得
function getTilesetForGid(gid: number, tilesets: TilesetData[]): TilesetData | null {
  const sorted = [...tilesets].sort((a, b) => b.firstGid - a.firstGid);
  for (const tileset of sorted) {
    if (gid >= tileset.firstGid) {
      return tileset;
    }
  }
  return null;
}

// Tiledのフリップフラグ
const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
const FLIPPED_VERTICALLY_FLAG = 0x40000000;
const FLIPPED_DIAGONALLY_FLAG = 0x20000000;

// TiledのフリップフラグをPixiJS groupD8に変換
function getRotationFromFlags(flipH: boolean, flipV: boolean, flipD: boolean): number {
  // PixiJS groupD8 values:
  // 0: no rotation
  // 2: 90° CW
  // 4: 180°
  // 6: 270° CW
  // 8: flip vertical (mirror over X axis)
  // 12: flip horizontal (mirror over Y axis)

  // Tiled uses diagonal flip + H/V for rotations
  if (flipD) {
    if (flipH && flipV) return 2;  // 90° CW
    if (flipH) return 6;           // 270° CW (90° CCW)
    if (flipV) return 2;           // 90° CW
    return 1;                       // diagonal only (swap x/y)
  }

  if (flipH && flipV) return 4;    // 180°
  if (flipH) return 12;            // horizontal flip
  if (flipV) return 8;             // vertical flip
  return 0;                        // no transform
}

// タイルのテクスチャ情報を取得
function getTileFrame(
  gid: number,
  tilesets: TilesetData[]
): { texture: Texture; frame: Rectangle; rotate: number } | null {
  const flipH = (gid & FLIPPED_HORIZONTALLY_FLAG) !== 0;
  const flipV = (gid & FLIPPED_VERTICALLY_FLAG) !== 0;
  const flipD = (gid & FLIPPED_DIAGONALLY_FLAG) !== 0;
  const rawGid = gid & ~(FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG | FLIPPED_DIAGONALLY_FLAG);

  if (rawGid === 0) return null;

  const tileset = getTilesetForGid(rawGid, tilesets);
  if (!tileset || !tileset.texture) return null;

  const localId = rawGid - tileset.firstGid;
  const col = localId % tileset.columns;
  const row = Math.floor(localId / tileset.columns);

  const x = col * tileset.tileWidth;
  const y = row * tileset.tileHeight;

  const frame = new Rectangle(x, y, tileset.tileWidth, tileset.tileHeight);
  const rotate = getRotationFromFlags(flipH, flipV, flipD);

  return { texture: tileset.texture, frame, rotate };
}

// レイヤーを描画
function renderLayer(
  layer: LayerData,
  tilesets: TilesetData[],
  tileWidth: number,
  tileHeight: number
): Container {
  const container = new Container();
  container.x = layer.offsetX;
  container.y = layer.offsetY;
  container.visible = layer.visible;

  // @pixi/tilemapを使用
  const tilemap = new CompositeTilemap();
  container.addChild(tilemap);

  for (const chunk of layer.chunks) {
    for (let i = 0; i < chunk.tiles.length; i++) {
      const gid = chunk.tiles[i];
      if (gid === 0) continue;

      const tileInfo = getTileFrame(gid, tilesets);
      if (!tileInfo) continue;

      const localX = i % chunk.width;
      const localY = Math.floor(i / chunk.width);
      const worldX = (chunk.x + localX) * tileWidth;
      const worldY = (chunk.y + localY) * tileHeight;

      // タイルを追加（u, vでテクスチャ座標、rotateでフリップ/回転を指定）
      tilemap.tile(tileInfo.texture, worldX, worldY, {
        u: tileInfo.frame.x,
        v: tileInfo.frame.y,
        tileWidth: tileWidth,
        tileHeight: tileHeight,
        rotate: tileInfo.rotate,
      });
    }
  }

  return container;
}

// 子要素を描画（レイヤーまたはグループ）
function renderChild(
  child: TmxChild,
  tilesets: TilesetData[],
  tileWidth: number,
  tileHeight: number
): Container {
  if (child.type === 'layer') {
    return renderLayer(child, tilesets, tileWidth, tileHeight);
  } else {
    return renderGroup(child, tilesets, tileWidth, tileHeight);
  }
}

// グループを描画（再帰的）
function renderGroup(
  group: GroupData,
  tilesets: TilesetData[],
  tileWidth: number,
  tileHeight: number
): Container {
  const container = new Container();
  container.visible = group.visible;

  // 子要素を順序通りに描画
  for (const child of group.children) {
    const childContainer = renderChild(child, tilesets, tileWidth, tileHeight);
    container.addChild(childContainer);
  }

  return container;
}

// TMXマップ全体を描画
export function renderTmxMap(data: TmxRenderData, scale: number = 4): Container {
  const container = new Container();

  // 子要素を順序通りに描画
  for (const child of data.children) {
    const childContainer = renderChild(child, data.tilesets, data.tileWidth, data.tileHeight);
    container.addChild(childContainer);
  }

  // コンテナ全体をスケール
  container.scale.set(scale);

  console.log(`[TMX] Rendered ${data.children.length} top-level elements`);

  return container;
}
