/**
 * TMXファイルパーサー
 * Tiledマップエディタで作成したTMXファイルからテーブル・座席情報を抽出
 */

import type { Table, Seat } from '../types';

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
  id: number;
  name: string;
  class?: string;
  offsetX: number;
  offsetY: number;
  chunks: ChunkData[];
}

// グループ情報
interface GroupData {
  id: number;
  name: string;
  class?: string;
  offsetX: number;
  offsetY: number;
  layers: LayerData[];
  groups: GroupData[];
}

// パース結果
export interface TmxMapData {
  tileWidth: number;
  tileHeight: number;
  tables: Table[];
  chairTileIds: Set<number>;
}

// タイルセットをパースしてchair typeのタイルIDを取得
async function parseTileset(tsxUrl: string): Promise<{ firstGid: number; chairTileIds: Set<number> }> {
  const response = await fetch(tsxUrl);
  const text = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  const chairTileIds = new Set<number>();

  // <tile> 要素を取得
  const tileElements = doc.querySelectorAll('tile');
  for (const tile of tileElements) {
    const id = parseInt(tile.getAttribute('id') || '0', 10);
    const type = tile.getAttribute('type');
    if (type === 'chair') {
      chairTileIds.add(id);
    }
  }

  return { firstGid: 1, chairTileIds };
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
  const offsetX = parseFloat(layerEl.getAttribute('offsetx') || '0') + parentOffsetX;
  const offsetY = parseFloat(layerEl.getAttribute('offsety') || '0') + parentOffsetY;

  const chunks: ChunkData[] = [];
  const chunkEls = layerEl.querySelectorAll(':scope > data > chunk');
  for (const chunkEl of chunkEls) {
    chunks.push(parseChunk(chunkEl));
  }

  return { id, name, class: layerClass, offsetX, offsetY, chunks };
}

// グループをパース（再帰的）
function parseGroup(groupEl: Element, parentOffsetX: number, parentOffsetY: number): GroupData {
  const id = parseInt(groupEl.getAttribute('id') || '0', 10);
  const name = groupEl.getAttribute('name') || '';
  const groupClass = groupEl.getAttribute('class') || undefined;
  const offsetX = parseFloat(groupEl.getAttribute('offsetx') || '0') + parentOffsetX;
  const offsetY = parseFloat(groupEl.getAttribute('offsety') || '0') + parentOffsetY;

  const layers: LayerData[] = [];
  const groups: GroupData[] = [];

  // 直接の子要素のみ取得
  for (const child of groupEl.children) {
    if (child.tagName === 'layer') {
      layers.push(parseLayer(child, offsetX, offsetY));
    } else if (child.tagName === 'group') {
      groups.push(parseGroup(child, offsetX, offsetY));
    }
  }

  return { id, name, class: groupClass, offsetX, offsetY, layers, groups };
}

// レイヤーまたはグループからchair位置を抽出
function extractChairPositions(
  item: LayerData | GroupData,
  chairTileIds: Set<number>,
  firstGid: number,
  tileWidth: number,
  tileHeight: number
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];

  if ('chunks' in item) {
    // LayerData
    const layer = item;
    for (const chunk of layer.chunks) {
      for (let i = 0; i < chunk.tiles.length; i++) {
        const gid = chunk.tiles[i];
        if (gid === 0) continue;

        // フラグをマスクしてタイルIDを取得（水平/垂直反転フラグ対応）
        const tileId = (gid & 0x0fffffff) - firstGid;

        if (chairTileIds.has(tileId)) {
          const localX = i % chunk.width;
          const localY = Math.floor(i / chunk.width);
          const worldX = (chunk.x + localX) * tileWidth + layer.offsetX;
          const worldY = (chunk.y + localY) * tileHeight + layer.offsetY;
          positions.push({ x: worldX, y: worldY });
        }
      }
    }
  } else {
    // GroupData
    const group = item as GroupData;
    for (const layer of group.layers) {
      positions.push(...extractChairPositions(layer, chairTileIds, firstGid, tileWidth, tileHeight));
    }
    for (const subGroup of group.groups) {
      positions.push(...extractChairPositions(subGroup, chairTileIds, firstGid, tileWidth, tileHeight));
    }
  }

  return positions;
}

// テーブルの中心位置を計算
function calculateTableCenter(
  item: LayerData | GroupData,
  tileWidth: number,
  tileHeight: number
): { x: number; y: number } {
  const allPositions: Array<{ x: number; y: number }> = [];

  const collectTilePositions = (target: LayerData | GroupData) => {
    if ('chunks' in target) {
      const layer = target;
      for (const chunk of layer.chunks) {
        for (let i = 0; i < chunk.tiles.length; i++) {
          const gid = chunk.tiles[i];
          if (gid === 0) continue;

          const localX = i % chunk.width;
          const localY = Math.floor(i / chunk.width);
          const worldX = (chunk.x + localX) * tileWidth + layer.offsetX;
          const worldY = (chunk.y + localY) * tileHeight + layer.offsetY;
          allPositions.push({ x: worldX, y: worldY });
        }
      }
    } else {
      const group = target as GroupData;
      for (const layer of group.layers) {
        collectTilePositions(layer);
      }
      for (const subGroup of group.groups) {
        collectTilePositions(subGroup);
      }
    }
  };

  collectTilePositions(item);

  if (allPositions.length === 0) {
    return { x: 0, y: 0 };
  }

  // 中心を計算
  const sumX = allPositions.reduce((sum, p) => sum + p.x, 0);
  const sumY = allPositions.reduce((sum, p) => sum + p.y, 0);

  return {
    x: sumX / allPositions.length + tileWidth / 2,
    y: sumY / allPositions.length + tileHeight / 2,
  };
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

  // タイルセットをパース（diner.tsxのみ対象）
  const tilesetEls = doc.querySelectorAll('tileset');
  let chairTileIds = new Set<number>();
  let firstGid = 1;

  for (const tilesetEl of tilesetEls) {
    const source = tilesetEl.getAttribute('source');
    if (source && source.includes('diner.tsx')) {
      firstGid = parseInt(tilesetEl.getAttribute('firstgid') || '1', 10);
      const tsxUrl = tmxUrl.replace(/[^/]+$/, source);
      const result = await parseTileset(tsxUrl);
      chairTileIds = result.chairTileIds;
      break;
    }
  }

  const tables: Table[] = [];
  let tableIndex = 0;
  let seatIndex = 0;

  // areaグループを探す
  const findTablesInGroup = (group: GroupData) => {
    // グループ内のレイヤーでclass="table"を探す
    for (const layer of group.layers) {
      if (layer.class === 'table') {
        const chairPositions = extractChairPositions(layer, chairTileIds, firstGid, tileWidth, tileHeight);
        const center = calculateTableCenter(layer, tileWidth, tileHeight);

        // 座席を作成
        const seats: Seat[] = chairPositions.map((pos) => {
          const seat: Seat = {
            id: `seat-${seatIndex++}`,
            localPosition: {
              x: pos.x - center.x,
              y: pos.y - center.y,
            },
            customerId: null,
          };
          return seat;
        });

        // chairが見つからない場合、テーブルレイヤー全体から座席を推測
        if (seats.length === 0) {
          // テーブルに座席がない場合はスキップしない
          // 代わりに、テーブルの周囲に仮想座席を配置するか、
          // またはこのテーブルはカウンター席などとして扱う
        }

        if (seats.length > 0) {
          tables.push({
            id: `table-${tableIndex++}`,
            position: center,
            seats,
          });
        }
      }
    }

    // サブグループでclass="table"を探す
    for (const subGroup of group.groups) {
      if (subGroup.class === 'table') {
        const chairPositions = extractChairPositions(subGroup, chairTileIds, firstGid, tileWidth, tileHeight);
        const center = calculateTableCenter(subGroup, tileWidth, tileHeight);

        const seats: Seat[] = chairPositions.map((pos) => {
          const seat: Seat = {
            id: `seat-${seatIndex++}`,
            localPosition: {
              x: pos.x - center.x,
              y: pos.y - center.y,
            },
            customerId: null,
          };
          return seat;
        });

        if (seats.length > 0) {
          tables.push({
            id: `table-${tableIndex++}`,
            position: center,
            seats,
          });
        }
      } else {
        // class="area"などの場合は再帰的に探す
        findTablesInGroup(subGroup);
      }
    }
  };

  // トップレベルのグループを探す
  const topGroups = doc.querySelectorAll('map > group');
  for (const groupEl of topGroups) {
    const group = parseGroup(groupEl, 0, 0);
    if (group.class === 'area') {
      findTablesInGroup(group);
    }
  }

  console.log('[TMX Parser] Parsed tables:', tables);

  return {
    tileWidth,
    tileHeight,
    tables,
    chairTileIds,
  };
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
