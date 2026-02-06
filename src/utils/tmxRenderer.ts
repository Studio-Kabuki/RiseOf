/**
 * TMXレンダラー
 * @pixi/tilemapを使用してTiledマップを描画
 */

import { Container, Assets, Texture, Rectangle } from 'pixi.js';
import { CompositeTilemap } from '@pixi/tilemap';

// タイルセット情報
export interface TilesetData {
  firstGid: number;
  name: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  tileCount: number;
  imageUrl: string;
  texture?: Texture;
}

// グローバルに保存するタイルセットデータ（MealSprite等から参照）
let globalTilesets: TilesetData[] = [];

// タイルセットデータを設定
export function setGlobalTilesets(tilesets: TilesetData[]): void {
  globalTilesets = tilesets;
}

// タイルセットデータを取得
export function getGlobalTilesets(): TilesetData[] {
  return globalTilesets;
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
  tableIndex?: number; // class="table"のグループ用のindex
}

// タイルオブジェクト（gidを持つオブジェクト）
interface TileObjectData {
  gid: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// オブジェクトグループ情報（decoration用）
interface ObjectgroupData {
  type: 'objectgroup';
  id: number;
  name: string;
  class?: string;
  visible: boolean;
  offsetX: number;
  offsetY: number;
  tileObjects: TileObjectData[]; // gidを持つオブジェクト（タイル配置）
}

// レイヤー、グループ、またはオブジェクトグループ
type TmxChild = LayerData | GroupData | ObjectgroupData;

// TMXマップ全体のデータ
export interface TmxRenderData {
  tileWidth: number;
  tileHeight: number;
  tilesets: TilesetData[];
  children: TmxChild[];
}

// レンダリング結果
export interface TmxRenderResult {
  container: Container;
  tableContainers: Map<number, Container>; // tableIndex -> Container
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

// プロパティを取得（TMX固有）
function getProperty(element: Element, propertyName: string): string | null {
  const propEl = element.querySelector(`:scope > properties > property[name="${propertyName}"]`);
  if (propEl) {
    return propEl.getAttribute('value');
  }
  return null;
}

// オブジェクトグループをパース（decoration用）
function parseObjectgroup(
  objgroupEl: Element,
  parentOffsetX: number,
  parentOffsetY: number
): ObjectgroupData | null {
  const id = parseInt(objgroupEl.getAttribute('id') || '0', 10);
  const name = objgroupEl.getAttribute('name') || '';
  const objgroupClass = objgroupEl.getAttribute('class') || undefined;
  const visible = objgroupEl.getAttribute('visible') !== '0';
  const offsetX = parseFloat(objgroupEl.getAttribute('offsetx') || '0') + parentOffsetX;
  const offsetY = parseFloat(objgroupEl.getAttribute('offsety') || '0') + parentOffsetY;

  // gidを持つオブジェクト（タイルオブジェクト）を抽出
  const tileObjects: TileObjectData[] = [];
  const objects = objgroupEl.querySelectorAll(':scope > object');
  for (const obj of objects) {
    const gidStr = obj.getAttribute('gid');
    if (gidStr) {
      const gid = parseInt(gidStr, 10);
      const x = parseFloat(obj.getAttribute('x') || '0');
      const y = parseFloat(obj.getAttribute('y') || '0');
      const width = parseFloat(obj.getAttribute('width') || '16');
      const height = parseFloat(obj.getAttribute('height') || '16');
      tileObjects.push({ gid, x, y, width, height });
    }
  }

  // タイルオブジェクトがなければスキップ
  if (tileObjects.length === 0) {
    return null;
  }

  return {
    type: 'objectgroup',
    id,
    name,
    class: objgroupClass,
    visible,
    offsetX,
    offsetY,
    tileObjects,
  };
}

// グループをパース（再帰的）
function parseGroup(groupEl: Element, parentOffsetX: number, parentOffsetY: number): GroupData {
  const id = parseInt(groupEl.getAttribute('id') || '0', 10);
  const name = groupEl.getAttribute('name') || '';
  const groupClass = groupEl.getAttribute('class') || undefined;
  const visible = groupEl.getAttribute('visible') !== '0';
  const offsetX = parseFloat(groupEl.getAttribute('offsetx') || '0') + parentOffsetX;
  const offsetY = parseFloat(groupEl.getAttribute('offsety') || '0') + parentOffsetY;

  // class="table"のグループからindexを取得
  let tableIndex: number | undefined;
  if (groupClass === 'table') {
    const indexStr = getProperty(groupEl, 'index');
    tableIndex = indexStr ? parseInt(indexStr, 10) : undefined;
  }

  const children: TmxChild[] = [];

  for (const child of groupEl.children) {
    if (child.tagName === 'layer') {
      children.push(parseLayer(child, offsetX, offsetY));
    } else if (child.tagName === 'group') {
      children.push(parseGroup(child, offsetX, offsetY));
    } else if (child.tagName === 'objectgroup') {
      // class="decoration"または特定の名前のオブジェクトグループをレンダリング対象に
      const objgroupClass = child.getAttribute('class');
      const objgroupName = child.getAttribute('name') || '';
      if (objgroupClass === 'decoration' || objgroupName === '飾り') {
        const objgroup = parseObjectgroup(child, offsetX, offsetY);
        if (objgroup) {
          children.push(objgroup);
        }
      }
    }
  }

  return { type: 'group', id, name, class: groupClass, visible, offsetX, offsetY, children, tableIndex };
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
    } else if (child.tagName === 'objectgroup') {
      // トップレベルのclass="decoration"または特定名のオブジェクトグループも対象
      const objgroupClass = child.getAttribute('class');
      const objgroupName = child.getAttribute('name') || '';
      if (objgroupClass === 'decoration' || objgroupName === '飾り') {
        const objgroup = parseObjectgroup(child, 0, 0);
        if (objgroup) {
          children.push(objgroup);
        }
      }
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
export function getTileFrame(
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

// オブジェクトグループを描画（decoration用タイルオブジェクト）
function renderObjectgroup(
  objgroup: ObjectgroupData,
  tilesets: TilesetData[],
  tileWidth: number,
  tileHeight: number
): Container {
  const container = new Container();
  container.x = objgroup.offsetX;
  container.y = objgroup.offsetY;
  container.visible = objgroup.visible;

  // タイルオブジェクトをスプライトとして配置
  const tilemap = new CompositeTilemap();
  container.addChild(tilemap);

  for (const tileObj of objgroup.tileObjects) {
    const tileInfo = getTileFrame(tileObj.gid, tilesets);
    if (!tileInfo) continue;

    // Tiledのタイルオブジェクトは左下原点なので、Y座標を調整
    // (x, y)は左下の座標、タイルの高さ分上にずらす
    const worldX = tileObj.x;
    const worldY = tileObj.y - tileObj.height;

    tilemap.tile(tileInfo.texture, worldX, worldY, {
      u: tileInfo.frame.x,
      v: tileInfo.frame.y,
      tileWidth: tileWidth,
      tileHeight: tileHeight,
      rotate: tileInfo.rotate,
    });
  }

  return container;
}

// 子要素を描画（レイヤー、グループ、またはオブジェクトグループ）
function renderChild(
  child: TmxChild,
  tilesets: TilesetData[],
  tileWidth: number,
  tileHeight: number,
  tableContainers: Map<number, Container>
): Container {
  if (child.type === 'layer') {
    return renderLayer(child, tilesets, tileWidth, tileHeight);
  } else if (child.type === 'objectgroup') {
    return renderObjectgroup(child, tilesets, tileWidth, tileHeight);
  } else {
    return renderGroup(child, tilesets, tileWidth, tileHeight, tableContainers);
  }
}

// グループを描画（再帰的）
function renderGroup(
  group: GroupData,
  tilesets: TilesetData[],
  tileWidth: number,
  tileHeight: number,
  tableContainers: Map<number, Container>
): Container {
  const container = new Container();
  container.visible = group.visible;

  // 子要素を順序通りに描画
  for (const child of group.children) {
    const childContainer = renderChild(child, tilesets, tileWidth, tileHeight, tableContainers);
    container.addChild(childContainer);
  }

  // テーブルグループの場合、参照を保存
  if (group.class === 'table' && group.tableIndex !== undefined) {
    tableContainers.set(group.tableIndex, container);
    console.log(`[TMX] Registered table container: index=${group.tableIndex}, name=${group.name}`);
  }

  return container;
}

// TMXマップ全体を描画
export function renderTmxMap(data: TmxRenderData): TmxRenderResult {
  const container = new Container();
  const tableContainers = new Map<number, Container>();

  // 子要素を順序通りに描画
  for (const child of data.children) {
    const childContainer = renderChild(child, data.tilesets, data.tileWidth, data.tileHeight, tableContainers);
    container.addChild(childContainer);
  }

  console.log(`[TMX] Rendered ${data.children.length} top-level elements, ${tableContainers.size} table groups`);

  return { container, tableContainers };
}
