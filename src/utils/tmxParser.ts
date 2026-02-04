/**
 * TMXファイルパーサー
 * Tiledマップエディタで作成したTMXファイルからテーブル・座席情報を抽出
 */

import type { Table, Seat } from '../types';

// カスタマー座席の情報
interface CustomerSeatData {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

// テーブルグループ情報
interface TableGroupData {
  name: string;
  index: number;
  offsetX: number;
  offsetY: number;
  customerSeats: CustomerSeatData[];
}

// パース結果
export interface TmxMapData {
  tileWidth: number;
  tileHeight: number;
  tables: Table[];
  tableGroups: TableGroupData[];
}

// プロパティを取得
function getProperty(element: Element, propertyName: string): string | null {
  const propEl = element.querySelector(`properties > property[name="${propertyName}"]`);
  if (propEl) {
    return propEl.getAttribute('value');
  }
  return null;
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
          const x = parseFloat(obj.getAttribute('x') || '0') + offsetX;
          const y = parseFloat(obj.getAttribute('y') || '0') + offsetY;
          const directionStr = getProperty(obj, 'direction') || 'down';
          const direction = directionStr as 'up' | 'down' | 'left' | 'right';

          customerSeats.push({ x, y, direction });
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
    }));

    return {
      id: tg.name, // table_00, table_01 などをIDとして使用
      position: { x: centerX, y: centerY },
      seats,
      index: tg.index, // 解放レベル
    };
  });

  console.log('[TMX Parser] Parsed table groups:', tableGroups);
  console.log('[TMX Parser] Tables:', tables);

  return {
    tileWidth,
    tileHeight,
    tables,
    tableGroups,
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
