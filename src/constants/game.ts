// キャンバスサイズ
export const CANVAS_WIDTH = 500;
export const CANVAS_HEIGHT = 500;

// 移動速度 (px/秒)
export const CUSTOMER_SPEED = 80;
export const STAFF_SPEED = 120;

// タイミング (秒)
export const ORDERING_DELAY = 0.5; // 着席から注文までの遅延
export const COOKING_TIME = 3; // 調理時間
export const EATING_TIME = 10; // 食事時間

// 料金
export const DORIA_PRICE = 30; // ドリアの価格

// レイアウト位置
export const ENTRANCE_POSITION = { x: 50, y: 250 };
export const EXIT_POSITION = { x: 50, y: 250 };
export const TABLE_POSITION = { x: 250, y: 250 };
export const KITCHEN_POSITION = { x: 450, y: 250 };

// レジエリア（店員の定位置）
export const REGISTER_POSITION = { x: 350, y: 420 };
export const REGISTER_SPACING = 50; // 店員間のスペース

// 店員の定位置を取得（インデックスに基づく）
export const getStaffIdlePosition = (staffIndex: number) => ({
  x: REGISTER_POSITION.x + staffIndex * REGISTER_SPACING,
  y: REGISTER_POSITION.y,
});

// 座席配置（テーブル中心からの相対位置）
export const SEAT_OFFSETS = [
  { x: -30, y: -30 }, // 左上
  { x: 30, y: -30 }, // 右上
  { x: -30, y: 30 }, // 左下
  { x: 30, y: 30 }, // 右下
];

// お客さんスポーン間隔（秒）
export const CUSTOMER_SPAWN_DELAY = 1.5;
