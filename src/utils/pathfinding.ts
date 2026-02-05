/**
 * A*経路探索アルゴリズム
 * タイルマップのコリジョンを考慮した最短経路を計算
 */

import type { Position } from '../types';

// グリッドセルサイズ（ピクセル）
const CELL_SIZE = 16;

// コリジョンマップ（グローバルで管理）
let collisionGrid: boolean[][] = [];
let gridWidth = 0;
let gridHeight = 0;
let gridOffsetX = 0;
let gridOffsetY = 0;

// 優先度付きキュー（ヒープ）
interface HeapNode {
  x: number;
  y: number;
  f: number; // f = g + h
  g: number; // スタートからのコスト
  parent: HeapNode | null;
}

class MinHeap {
  private heap: HeapNode[] = [];
  private positions: Map<string, number> = new Map();

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  push(node: HeapNode): void {
    const k = this.key(node.x, node.y);
    const existingIdx = this.positions.get(k);
    if (existingIdx !== undefined) {
      // 既存ノードを更新（より良いパスの場合）
      if (node.g < this.heap[existingIdx].g) {
        this.heap[existingIdx] = node;
        this.bubbleUp(existingIdx);
      }
      return;
    }
    this.heap.push(node);
    this.positions.set(k, this.heap.length - 1);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): HeapNode | undefined {
    if (this.heap.length === 0) return undefined;
    const result = this.heap[0];
    const last = this.heap.pop()!;
    this.positions.delete(this.key(result.x, result.y));
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.positions.set(this.key(last.x, last.y), 0);
      this.bubbleDown(0);
    }
    return result;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.heap[parentIdx].f <= this.heap[idx].f) break;
      this.swap(idx, parentIdx);
      idx = parentIdx;
    }
  }

  private bubbleDown(idx: number): void {
    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;
      if (left < this.heap.length && this.heap[left].f < this.heap[smallest].f) {
        smallest = left;
      }
      if (right < this.heap.length && this.heap[right].f < this.heap[smallest].f) {
        smallest = right;
      }
      if (smallest === idx) break;
      this.swap(idx, smallest);
      idx = smallest;
    }
  }

  private swap(i: number, j: number): void {
    const a = this.heap[i];
    const b = this.heap[j];
    this.heap[i] = b;
    this.heap[j] = a;
    this.positions.set(this.key(a.x, a.y), j);
    this.positions.set(this.key(b.x, b.y), i);
  }
}

/**
 * コリジョングリッドを初期化
 */
export function initCollisionGrid(
  width: number,
  height: number,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  gridWidth = Math.ceil(width / CELL_SIZE);
  gridHeight = Math.ceil(height / CELL_SIZE);
  gridOffsetX = offsetX;
  gridOffsetY = offsetY;

  // 全てのセルを通行可能で初期化
  collisionGrid = [];
  for (let y = 0; y < gridHeight; y++) {
    collisionGrid[y] = [];
    for (let x = 0; x < gridWidth; x++) {
      collisionGrid[y][x] = false; // false = 通行可能
    }
  }
}

/**
 * 矩形領域にコリジョンを設定
 */
export function setCollisionRect(
  x: number,
  y: number,
  width: number,
  height: number,
  collision: boolean = true
): void {
  const startX = Math.floor((x - gridOffsetX) / CELL_SIZE);
  const startY = Math.floor((y - gridOffsetY) / CELL_SIZE);
  const endX = Math.ceil((x + width - gridOffsetX) / CELL_SIZE);
  const endY = Math.ceil((y + height - gridOffsetY) / CELL_SIZE);

  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      if (gy >= 0 && gy < gridHeight && gx >= 0 && gx < gridWidth) {
        collisionGrid[gy][gx] = collision;
      }
    }
  }
}

/**
 * 単一セルにコリジョンを設定
 */
export function setCollisionCell(gridX: number, gridY: number, collision: boolean = true): void {
  if (gridY >= 0 && gridY < gridHeight && gridX >= 0 && gridX < gridWidth) {
    collisionGrid[gridY][gridX] = collision;
  }
}

/**
 * ピクセル座標をグリッド座標に変換
 */
export function pixelToGrid(x: number, y: number): { gx: number; gy: number } {
  return {
    gx: Math.floor((x - gridOffsetX) / CELL_SIZE),
    gy: Math.floor((y - gridOffsetY) / CELL_SIZE),
  };
}

/**
 * グリッド座標をピクセル座標（セル中心）に変換
 */
export function gridToPixel(gx: number, gy: number): { x: number; y: number } {
  return {
    x: gx * CELL_SIZE + CELL_SIZE / 2 + gridOffsetX,
    y: gy * CELL_SIZE + CELL_SIZE / 2 + gridOffsetY,
  };
}

/**
 * 指定位置が通行可能かチェック
 */
export function isWalkable(x: number, y: number): boolean {
  const { gx, gy } = pixelToGrid(x, y);
  if (gy < 0 || gy >= gridHeight || gx < 0 || gx >= gridWidth) {
    return false; // グリッド外は通行不可
  }
  return !collisionGrid[gy][gx];
}

/**
 * グリッド座標が通行可能かチェック
 */
function isGridWalkable(gx: number, gy: number): boolean {
  if (gy < 0 || gy >= gridHeight || gx < 0 || gx >= gridWidth) {
    return false;
  }
  return !collisionGrid[gy][gx];
}

/**
 * マンハッタン距離（ヒューリスティック）
 */
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// 8方向移動（斜め移動も許可）
const DIRECTIONS = [
  { dx: 0, dy: -1, cost: 1 },    // 上
  { dx: 1, dy: 0, cost: 1 },     // 右
  { dx: 0, dy: 1, cost: 1 },     // 下
  { dx: -1, dy: 0, cost: 1 },    // 左
  { dx: 1, dy: -1, cost: 1.41 }, // 右上
  { dx: 1, dy: 1, cost: 1.41 },  // 右下
  { dx: -1, dy: 1, cost: 1.41 }, // 左下
  { dx: -1, dy: -1, cost: 1.41 }, // 左上
];

/**
 * A*アルゴリズムで経路を探索
 * @param from 開始位置（ピクセル座標）
 * @param to 目標位置（ピクセル座標）
 * @returns 経路（ピクセル座標の配列）。経路が見つからない場合は直線経路
 */
export function findPath(from: Position, to: Position): Position[] {
  const start = pixelToGrid(from.x, from.y);
  const end = pixelToGrid(to.x, to.y);

  // デバッグ: 開始・終了位置のコリジョン状態を確認
  const startWalkable = isGridWalkable(start.gx, start.gy);
  const endWalkable = isGridWalkable(end.gx, end.gy);

  if (!startWalkable || !endWalkable) {
    console.warn('[Pathfinding] Start or end not walkable:', {
      from: { ...from, grid: start, walkable: startWalkable },
      to: { ...to, grid: end, walkable: endWalkable },
    });
  }

  // 開始・終了が同じセル
  if (start.gx === end.gx && start.gy === end.gy) {
    return [to];
  }

  // 開始位置が通行不可の場合は直線経路を返す（店員の初期位置がコリジョン内の場合など）
  if (!startWalkable) {
    console.warn('[Pathfinding] Start position in collision, using direct path');
    return [to];
  }

  // 終点が通行不可の場合、最寄りの通行可能セルを探す
  let targetGx = end.gx;
  let targetGy = end.gy;
  if (!isGridWalkable(targetGx, targetGy)) {
    // 周囲8セルから最寄りの通行可能セルを探す
    let found = false;
    for (let r = 1; r <= 5 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const nx = end.gx + dx;
            const ny = end.gy + dy;
            if (isGridWalkable(nx, ny)) {
              targetGx = nx;
              targetGy = ny;
              found = true;
            }
          }
        }
      }
    }
    if (!found) {
      // 通行可能なセルが見つからない場合は直線経路
      return [to];
    }
  }

  const openSet = new MinHeap();
  const closedSet = new Set<string>();

  const startNode: HeapNode = {
    x: start.gx,
    y: start.gy,
    g: 0,
    f: heuristic(start.gx, start.gy, targetGx, targetGy),
    parent: null,
  };

  openSet.push(startNode);

  let iterations = 0;
  const maxIterations = gridWidth * gridHeight; // 安全策

  while (!openSet.isEmpty() && iterations < maxIterations) {
    iterations++;
    const current = openSet.pop()!;

    // 目標に到達
    if (current.x === targetGx && current.y === targetGy) {
      // パスを構築
      const path: Position[] = [];
      let node: HeapNode | null = current;
      while (node) {
        const pixel = gridToPixel(node.x, node.y);
        path.unshift(pixel);
        node = node.parent;
      }
      // 最初の点（現在位置）は除外
      if (path.length > 0) path.shift();
      // 最終目標位置を追加
      if (path.length > 0) {
        path[path.length - 1] = to;
      } else {
        path.push(to);
      }
      return path;
    }

    const key = `${current.x},${current.y}`;
    if (closedSet.has(key)) continue;
    closedSet.add(key);

    // 隣接セルを探索
    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (!isGridWalkable(nx, ny)) continue;

      // 斜め移動の場合、隣接セルもチェック（壁抜け防止）
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!isGridWalkable(current.x + dir.dx, current.y) ||
            !isGridWalkable(current.x, current.y + dir.dy)) {
          continue;
        }
      }

      const neighborKey = `${nx},${ny}`;
      if (closedSet.has(neighborKey)) continue;

      const g = current.g + dir.cost;
      const h = heuristic(nx, ny, targetGx, targetGy);
      const f = g + h;

      openSet.push({
        x: nx,
        y: ny,
        g,
        f,
        parent: current,
      });
    }
  }

  // パスが見つからない場合は直線経路を返す
  console.warn('[Pathfinding] No path found, using direct line');
  return [to];
}

/**
 * 現在位置から目標位置への次のウェイポイントを取得
 * 経路をキャッシュして効率的に移動
 */
export interface PathState {
  targetX: number;
  targetY: number;
  waypoints: Position[];
  currentIndex: number;
}

/**
 * 経路状態を作成
 */
export function createPathState(from: Position, to: Position): PathState {
  const waypoints = findPath(from, to);
  return {
    targetX: to.x,
    targetY: to.y,
    waypoints,
    currentIndex: 0,
  };
}

/**
 * 経路に沿って次のウェイポイントを取得
 * @param pathState 経路状態
 * @param currentPos 現在位置
 * @param arrivalThreshold ウェイポイント到達判定距離
 * @returns 次の目標位置（経路完了時はnull）
 */
export function getNextWaypoint(
  pathState: PathState,
  currentPos: Position,
  arrivalThreshold: number = 8
): Position | null {
  if (pathState.currentIndex >= pathState.waypoints.length) {
    return null; // 経路完了
  }

  const waypoint = pathState.waypoints[pathState.currentIndex];
  const dx = waypoint.x - currentPos.x;
  const dy = waypoint.y - currentPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= arrivalThreshold) {
    // 現在のウェイポイントに到達、次へ進む
    pathState.currentIndex++;
    if (pathState.currentIndex >= pathState.waypoints.length) {
      return null; // 経路完了
    }
    return pathState.waypoints[pathState.currentIndex];
  }

  return waypoint;
}

/**
 * 経路が有効か（目標位置が変わっていないか）チェック
 */
export function isPathValid(pathState: PathState | null, targetPos: Position): boolean {
  if (!pathState) return false;
  const dx = pathState.targetX - targetPos.x;
  const dy = pathState.targetY - targetPos.y;
  return Math.abs(dx) < 1 && Math.abs(dy) < 1;
}

/**
 * コリジョングリッドをデバッグ用に取得
 */
export function getCollisionGridDebug(): { grid: boolean[][]; width: number; height: number } {
  return {
    grid: collisionGrid,
    width: gridWidth,
    height: gridHeight,
  };
}

/**
 * グリッドサイズを取得
 */
export function getCellSize(): number {
  return CELL_SIZE;
}

// デバッグ表示状態
let debugVisible = false;
let debugChangeListeners: Array<(visible: boolean) => void> = [];

/**
 * デバッグ表示を切り替え
 */
export function toggleDebugCollision(): boolean {
  debugVisible = !debugVisible;
  debugChangeListeners.forEach(listener => listener(debugVisible));
  return debugVisible;
}

/**
 * デバッグ表示状態を取得
 */
export function isDebugCollisionVisible(): boolean {
  return debugVisible;
}

/**
 * デバッグ表示状態変更リスナーを登録
 */
export function onDebugCollisionChange(listener: (visible: boolean) => void): () => void {
  debugChangeListeners.push(listener);
  return () => {
    debugChangeListeners = debugChangeListeners.filter(l => l !== listener);
  };
}

/**
 * グリッド情報を取得（デバッグ描画用）
 */
export function getGridInfo(): {
  grid: boolean[][];
  width: number;
  height: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
} {
  return {
    grid: collisionGrid,
    width: gridWidth,
    height: gridHeight,
    cellSize: CELL_SIZE,
    offsetX: gridOffsetX,
    offsetY: gridOffsetY,
  };
}
