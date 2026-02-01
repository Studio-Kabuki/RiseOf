// 2D座標
export interface Position {
  x: number;
  y: number;
}

// 全エンティティの基底
export interface Entity {
  id: string;
  position: Position;
  targetPosition?: Position; // 移動先（なければ静止）
  speed: number; // 移動速度 (px/秒)
}
