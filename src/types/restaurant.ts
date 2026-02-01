import type { Position } from './entity';
import type { Table } from './table';
import type { Kitchen } from './kitchen';

export interface Restaurant {
  tables: Table[];
  kitchen: Kitchen;
  entrancePosition: Position; // 入口位置
  exitPosition: Position; // 出口位置
}
