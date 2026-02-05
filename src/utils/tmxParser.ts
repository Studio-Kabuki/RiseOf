/**
 * TMXファイルパーサー
 * Tiledマップエディタで作成したTMXファイルからテーブル・座席情報を抽出
 */

import type { Table, Seat } from '../types';
import { initCollisionGrid, setCollisionRect } from './pathfinding';

// コリジョン矩形情報
export interface CollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// カスタマー座席の情報
interface CustomerSeatData {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  servingOffset?: number; // 配膳位置のオフセット（デフォルト1マス + この値）
}

// テーブルグループ情報
interface TableGroupData {
  name: string;
  index: number;
  offsetX: number;
  offsetY: number;
  customerSeats: CustomerSeatData[];
}

// スタッフ初期位置
export interface StaffPositionData {
  index: number;
  x: number;
  y: number;
}

// スポーン位置（お客さんの生成位置）
export interface SpawnPointData {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

// タイルセット情報
interface TilesetData {
  firstGid: number;
  source: string; // TSXファイルパス
  tileCollisions: Map<number, boolean>; // タイルID -> collision
}

// チャンクデータ
interface ChunkData {
  x: number;
  y: number;
  width: number;
  height: number;
  tiles: number[]; // タイルGID配列
}

// レイヤーデータ
interface LayerData {
  name: string;
  chunks: ChunkData[];
}

// パース結果
export interface TmxMapData {
  tileWidth: number;
  tileHeight: number;
  mapWidth: number; // マップ幅（ピクセル）
  mapHeight: number; // マップ高さ（ピクセル）
  tables: Table[];
  tableGroups: TableGroupData[];
  cameraCenter?: { x: number; y: number }; // カメラ初期位置
  staffPositions: StaffPositionData[]; // スタッフ初期位置
  spawnPoints: SpawnPointData[]; // お客さん生成位置
  collisionRects: CollisionRect[]; // コリジョン矩形
  tilesets: TilesetData[]; // タイルセット情報
  layers: LayerData[]; // レイヤーデータ
}

// プロパティを取得
function getProperty(element: Element, propertyName: string): string | null {
  const propEl = element.querySelector(`properties > property[name="${propertyName}"]`);
  if (propEl) {
    return propEl.getAttribute('value');
  }
  return null;
}

// TSXファイルをパースしてタイルのコリジョン情報を取得
async function parseTsxFile(tsxUrl: string): Promise<Map<number, boolean>> {
  const tileCollisions = new Map<number, boolean>();

  try {
    const response = await fetch(tsxUrl);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');

    const tiles = doc.querySelectorAll('tile');
    for (const tile of tiles) {
      const id = parseInt(tile.getAttribute('id') || '0', 10);
      const collisionProp = getProperty(tile, 'collision');
      if (collisionProp === 'true') {
        tileCollisions.set(id, true);
      }
    }

    console.log(`[TMX Parser] Parsed TSX ${tsxUrl}, found ${tileCollisions.size} collision tiles`);
  } catch (error) {
    console.warn(`[TMX Parser] Failed to parse TSX file: ${tsxUrl}`, error);
  }

  return tileCollisions;
}

// グループからテーブル情報を抽出（再帰的）
function findTableGroups(
  groupEl: Element,
  parentOffsetX: number,
  parentOffsetY: number
): TableGroupData[] {
  const tables: TableGroupData[] = [];

  const name = groupEl.getAttribute('name') || '';
  const groupClass = groupEl.getAttribute('class');
  const offsetX = parseFloat(groupEl.getAttribute('offsetx') || '0') + parentOffsetX;
  const offsetY = parseFloat(groupEl.getAttribute('offsety') || '0') + parentOffsetY;

  // このグループがテーブルの場合
  if (groupClass === 'table') {
    const indexStr = getProperty(groupEl, 'index');
    const index = indexStr ? parseInt(indexStr, 10) : 0;

    // オブジェクトレイヤーからcustomer座席を取得
    const customerSeats: CustomerSeatData[] = [];
    const objectGroups = groupEl.querySelectorAll(':scope > objectgroup');

    for (const objGroup of objectGroups) {
      const objects = objGroup.querySelectorAll(':scope > object');
      for (const obj of objects) {
        const objType = obj.getAttribute('type');
        if (objType === 'customer') {
          // オブジェクトの中心座標を計算（Tiledは左上原点）
          const objX = parseFloat(obj.getAttribute('x') || '0');
          const objY = parseFloat(obj.getAttribute('y') || '0');
          const objW = parseFloat(obj.getAttribute('width') || '16');
          const objH = parseFloat(obj.getAttribute('height') || '16');
          const x = objX + objW / 2 + offsetX;
          const y = objY + objH / 2 + offsetY;
          const directionStr = getProperty(obj, 'direction') || 'down';
          const direction = directionStr as 'up' | 'down' | 'left' | 'right';
          // 配膳位置オフセット（デフォルト1マス + offset値）
          const offsetStr = getProperty(obj, 'offset');
          const servingOffset = offsetStr ? parseFloat(offsetStr) : undefined;

          customerSeats.push({ x, y, direction, servingOffset });
        }
      }
    }

    tables.push({
      name,
      index,
      offsetX,
      offsetY,
      customerSeats,
    });
  }

  // 子グループを再帰的に検索
  const childGroups = groupEl.querySelectorAll(':scope > group');
  for (const childGroup of childGroups) {
    tables.push(...findTableGroups(childGroup, offsetX, offsetY));
  }

  return tables;
}

// TMXファイルをパース
export async function parseTmxFile(tmxUrl: string): Promise<TmxMapData> {
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
  const mapWidthTiles = parseInt(mapEl.getAttribute('width') || '0', 10);
  const mapHeightTiles = parseInt(mapEl.getAttribute('height') || '0', 10);
  const mapWidth = mapWidthTiles * tileWidth;
  const mapHeight = mapHeightTiles * tileHeight;

  // TMXファイルのベースURLを取得（相対パス解決用）
  const baseUrl = tmxUrl.substring(0, tmxUrl.lastIndexOf('/') + 1);

  // タイルセット情報を取得
  const tilesets: TilesetData[] = [];
  const tilesetElements = doc.querySelectorAll('tileset');
  for (const tilesetEl of tilesetElements) {
    const firstGid = parseInt(tilesetEl.getAttribute('firstgid') || '1', 10);
    const source = tilesetEl.getAttribute('source') || '';
    if (source) {
      const tsxUrl = baseUrl + source;
      const tileCollisions = await parseTsxFile(tsxUrl);
      tilesets.push({ firstGid, source, tileCollisions });
    }
  }

  // タイルセットをfirstGidでソート（降順で検索しやすく）
  tilesets.sort((a, b) => b.firstGid - a.firstGid);

  // レイヤーデータを取得
  const layers: LayerData[] = [];
  const layerElements = doc.querySelectorAll('layer');
  for (const layerEl of layerElements) {
    const layerName = layerEl.getAttribute('name') || '';

    const chunks: ChunkData[] = [];
    const chunkElements = layerEl.querySelectorAll('chunk');
    for (const chunkEl of chunkElements) {
      const chunkX = parseInt(chunkEl.getAttribute('x') || '0', 10);
      const chunkY = parseInt(chunkEl.getAttribute('y') || '0', 10);
      const chunkWidth = parseInt(chunkEl.getAttribute('width') || '16', 10);
      const chunkHeight = parseInt(chunkEl.getAttribute('height') || '16', 10);
      const csvData = chunkEl.textContent || '';
      const tiles = csvData
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      chunks.push({
        x: chunkX,
        y: chunkY,
        width: chunkWidth,
        height: chunkHeight,
        tiles,
      });
    }

    layers.push({ name: layerName, chunks });
  }

  // 全てのテーブルグループを取得
  const tableGroups: TableGroupData[] = [];

  // トップレベルの要素から再帰的にテーブルを探す
  for (const child of mapEl.children) {
    if (child.tagName === 'group') {
      tableGroups.push(...findTableGroups(child, 0, 0));
    }
  }

  // テーブルをindexでソート
  tableGroups.sort((a, b) => a.index - b.index);

  // Table型に変換
  const tables: Table[] = tableGroups.map((tg, idx) => {
    // 座席の中心をテーブル位置とする
    let centerX = tg.offsetX;
    let centerY = tg.offsetY;

    if (tg.customerSeats.length > 0) {
      const sumX = tg.customerSeats.reduce((sum, s) => sum + s.x, 0);
      const sumY = tg.customerSeats.reduce((sum, s) => sum + s.y, 0);
      centerX = sumX / tg.customerSeats.length;
      centerY = sumY / tg.customerSeats.length;
    }

    // 座席を作成
    const seats: Seat[] = tg.customerSeats.map((cs, seatIdx) => ({
      id: `seat-${idx}-${seatIdx}`,
      localPosition: {
        x: cs.x - centerX,
        y: cs.y - centerY,
      },
      customerId: null,
      direction: cs.direction, // 配膳位置計算用のお客さんの向き
      servingOffset: cs.servingOffset, // 配膳位置のオフセット
    }));

    return {
      id: tg.name, // table_00, table_01 などをIDとして使用
      position: { x: centerX, y: centerY },
      seats,
      index: tg.index, // 解放レベル
    };
  });

  // 各種オブジェクトを探す
  let cameraCenter: { x: number; y: number } | undefined;
  const staffPositions: StaffPositionData[] = [];
  const spawnPoints: SpawnPointData[] = [];
  const collisionRects: CollisionRect[] = [];

  const allObjects = doc.querySelectorAll('object');
  for (const obj of allObjects) {
    const objType = obj.getAttribute('type');
    const objX = parseFloat(obj.getAttribute('x') || '0');
    const objY = parseFloat(obj.getAttribute('y') || '0');
    const objW = parseFloat(obj.getAttribute('width') || '16');
    const objH = parseFloat(obj.getAttribute('height') || '16');
    // オブジェクトの中心座標を計算（Tiledは左上原点）
    const centerX = objX + objW / 2;
    const centerY = objY + objH / 2;

    if (objType === 'camera_center') {
      cameraCenter = { x: centerX, y: centerY };
    } else if (objType === 'staff') {
      const indexStr = getProperty(obj, 'index');
      const index = indexStr ? parseInt(indexStr, 10) : 0;
      staffPositions.push({ index, x: centerX, y: centerY });
    } else if (objType === 'spawn') {
      const directionStr = getProperty(obj, 'direction') || 'down';
      const direction = directionStr as 'up' | 'down' | 'left' | 'right';
      spawnPoints.push({ x: centerX, y: centerY, direction });
    }

    // コリジョンプロパティをチェック
    const collisionProp = getProperty(obj, 'collision');
    if (collisionProp === 'true') {
      collisionRects.push({
        x: objX,
        y: objY,
        width: objW,
        height: objH,
      });
    }
  }

  // staffPositionsをindexでソート
  staffPositions.sort((a, b) => a.index - b.index);

  console.log('[TMX Parser] Parsed table groups:', tableGroups);
  console.log('[TMX Parser] Tables:', tables);
  console.log('[TMX Parser] Seat directions:', tables.flatMap(t =>
    t.seats.map(s => ({ tableId: t.id, seatId: s.id, direction: s.direction }))
  ));
  console.log('[TMX Parser] Camera center:', cameraCenter);
  console.log('[TMX Parser] Staff positions:', staffPositions);
  console.log('[TMX Parser] Spawn points:', spawnPoints);
  console.log('[TMX Parser] Collision rects:', collisionRects);

  return {
    tileWidth,
    tileHeight,
    mapWidth,
    mapHeight,
    tables,
    tableGroups,
    cameraCenter,
    staffPositions,
    spawnPoints,
    collisionRects,
    tilesets,
    layers,
  };
}

/**
 * GIDから対応するタイルセットとローカルタイルIDを取得
 */
function getTileInfo(
  gid: number,
  tilesets: TilesetData[]
): { tileset: TilesetData; localId: number } | null {
  if (gid === 0) return null; // 空タイル

  // tilesetsは降順ソート済みなので、最初にマッチしたものが正しいタイルセット
  for (const tileset of tilesets) {
    if (gid >= tileset.firstGid) {
      return {
        tileset,
        localId: gid - tileset.firstGid,
      };
    }
  }
  return null;
}

/**
 * コリジョングリッドを初期化
 * TMXパース後に呼び出す
 */
export function initCollisionFromTmx(tmxData: TmxMapData): void {
  // グリッドを初期化（マップ全体をカバー）
  initCollisionGrid(tmxData.mapWidth, tmxData.mapHeight);

  // 1. オブジェクトレイヤーのコリジョン矩形を登録
  for (const rect of tmxData.collisionRects) {
    setCollisionRect(rect.x, rect.y, rect.width, rect.height, true);
  }

  // 2. タイルレイヤーからタイルレベルのコリジョンを登録
  let tileCollisionCount = 0;
  for (const layer of tmxData.layers) {
    for (const chunk of layer.chunks) {
      for (let i = 0; i < chunk.tiles.length; i++) {
        const gid = chunk.tiles[i];
        if (gid === 0) continue; // 空タイル

        const tileInfo = getTileInfo(gid, tmxData.tilesets);
        if (!tileInfo) continue;

        // このタイルがコリジョンを持っているか確認
        if (tileInfo.tileset.tileCollisions.get(tileInfo.localId)) {
          // チャンク内の座標を計算
          const localX = i % chunk.width;
          const localY = Math.floor(i / chunk.width);

          // ピクセル座標を計算
          const pixelX = (chunk.x + localX) * tmxData.tileWidth;
          const pixelY = (chunk.y + localY) * tmxData.tileHeight;

          // コリジョンを設定
          setCollisionRect(
            pixelX,
            pixelY,
            tmxData.tileWidth,
            tmxData.tileHeight,
            true
          );
          tileCollisionCount++;
        }
      }
    }
  }

  console.log('[Collision] Initialized grid:', {
    mapWidth: tmxData.mapWidth,
    mapHeight: tmxData.mapHeight,
    collisionRectsCount: tmxData.collisionRects.length,
    tileCollisionCount,
    staffPositions: tmxData.staffPositions,
  });
}

// ピクセル座標にスケールを適用（16pxタイルを64pxに拡大など）
export function scaleTablePositions(tables: Table[], scale: number): Table[] {
  return tables.map((table) => ({
    ...table,
    position: {
      x: table.position.x * scale,
      y: table.position.y * scale,
    },
    seats: table.seats.map((seat) => ({
      ...seat,
      localPosition: {
        x: seat.localPosition.x * scale,
        y: seat.localPosition.y * scale,
      },
    })),
  }));
}
