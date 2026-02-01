// キャンバスサイズ
export const CANVAS_WIDTH = 500;
export const CANVAS_HEIGHT = 500;

// 移動速度 (px/秒)
export const CUSTOMER_SPEED = 80;
export const STAFF_SPEED = 120;
export const COOK_SPEED = 60; // コックの移動速度（あまり使わないが一応）

// タイミング (秒)
export const ORDERING_DELAY = 0.5; // 着席から注文までの遅延
export const COOKING_TIME = 3; // 調理時間
export const EATING_TIME = 10; // 食事時間
export const DAY_DURATION = 60; // 1日の長さ（秒）

// 料金
export const DORIA_PRICE = 30; // ドリアの価格

// 家賃（ノルマ）
export const BASE_RENT = 100; // 基本家賃（Day1の家賃）
export const RENT_EXPONENT = 1.5; // 家賃の増加指数（毎日1.5乗で増加）

// レイアウト位置
// 上側：キッチン → レジ
// 下側：入り口
// 座席：中央右寄り
export const KITCHEN_POSITION = { x: 250, y: 60 };
export const REGISTER_POSITION = { x: 150, y: 140 }; // レジエリア（店員の定位置）
export const REGISTER_SPACING = 50; // 店員間のスペース
export const TABLE_POSITION = { x: 320, y: 280 }; // 座席は右寄り
export const ENTRANCE_POSITION = { x: 100, y: 450 }; // 下側
export const EXIT_POSITION = { x: 100, y: 450 };

// 店員の定位置を取得（インデックスに基づく）
export const getStaffIdlePosition = (staffIndex: number) => ({
  x: REGISTER_POSITION.x + staffIndex * REGISTER_SPACING,
  y: REGISTER_POSITION.y,
});

// キッチンスタッフ用のレイアウト
export const COOK_SPACING = 40; // コック間のスペース

// コックの定位置を取得（キッチン内、インデックスに基づく）
export const getCookIdlePosition = (cookIndex: number) => ({
  x: KITCHEN_POSITION.x - 30 + cookIndex * COOK_SPACING,
  y: KITCHEN_POSITION.y,
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

// アイコンURL（Icon8）
// URL形式: https://img.icons8.com/{style}/{size}/{name}.png
export const ICONS = {
  // 料理
  doria: 'https://img.icons8.com/fluency/48/rice-bowl.png',

  // 店員状態アイコン
  staff: {
    movingToKitchen: 'https://img.icons8.com/fluency/48/running.png',
    pickingFood: 'https://img.icons8.com/fluency/48/cooking-pot.png',
    delivering: 'https://img.icons8.com/fluency/48/waiter.png',
    serving: 'https://img.icons8.com/fluency/48/restaurant.png',
  },
};
