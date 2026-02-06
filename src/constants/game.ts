// ============================================================
// ゲームバランス設定
// ============================================================
// このファイルはゲームバランスに関わるパラメータを集約しています
// 将来的にゲーム内アップグレードで変更可能になる予定のパラメータは
// "UPGRADEABLE" とコメントされています
// ============================================================

// ------------------------------------------------------------
// キャンバス・レイアウト設定
// ------------------------------------------------------------
export const CANVAS_WIDTH = 500;
export const CANVAS_HEIGHT = 500;

// レイアウト位置
export const KITCHEN_POSITION = { x: 250, y: 60 };
export const REGISTER_POSITION = { x: 150, y: 140 }; // 店員の定位置
export const REGISTER_SPACING = 50; // 店員間のスペース
export const TABLE_POSITION = { x: 320, y: 280 }; // 座席の中心位置

// 追加テーブルの位置（最大4回分のアップグレード）
export const ADDITIONAL_TABLE_POSITIONS = [
  { x: 180, y: 280 }, // 2つ目: 初期テーブルの左
  { x: 320, y: 400 }, // 3つ目: 初期テーブルの下
  { x: 180, y: 400 }, // 4つ目: 左下
  { x: 450, y: 280 }, // 5つ目: 初期テーブルの右
];
export const ENTRANCE_POSITION = { x: 100, y: 450 };
export const EXIT_POSITION = { x: 100, y: 450 };

// 座席配置（テーブル中心からの相対位置）
export const SEAT_OFFSETS = [
  { x: -30, y: -30 }, // 左上
  { x: 30, y: -30 },  // 右上
  { x: -30, y: 30 },  // 左下
  { x: 30, y: 30 },   // 右下
];

// スタッフ配置間隔（統合スタッフシステム用）
export const STAFF_SPACING = 40;

// ------------------------------------------------------------
// 時間・タイミング設定
// ------------------------------------------------------------

// 1日の長さ（秒）
export const DAY_DURATION = 30;

// お客さんスポーン間隔（秒）- UPGRADEABLE: 広告などで短縮可能
export const CUSTOMER_SPAWN_DELAY = 3;

// 着席から注文までの遅延（秒）
export const ORDERING_DELAY = 0.5;

// 食事時間（秒）- UPGRADEABLE: 椅子のアップグレードで短縮可能?
export const EATING_TIME = 2;

// デフォルト調理時間（秒）
export const COOKING_TIME = 2;

// ------------------------------------------------------------
// 移動速度設定 (px/秒)
// ------------------------------------------------------------

// お客さんの移動速度 - UPGRADEABLE: 椅子の快適さで変化?
export const CUSTOMER_SPEED = 27; // 元53の1/2

// 店員の移動速度 - UPGRADEABLE: 店員のレベルアップで向上
export const STAFF_SPEED = 67; // 元133の1/2

// スタッフの調理時移動速度（キッチン内での動き）
export const STAFF_COOKING_SPEED = 100;

// ------------------------------------------------------------
// 経済・ノルマ設定
// ------------------------------------------------------------

// 各日のノルマ（固定値リスト）
// bairitu.md に基づく。調整する場合はこの配列を編集。
export const DAILY_QUOTAS = [
  30,              // #1
  90,             // #2  (中間)
  300,             // #4  (中間)
  666,             // #5
  2222,            // #7
  7361,            // #8  (中間)
  12500,           // #9
  22917,           // #10 (中間)
  33333,           // #11
  50000,           // #12 (中間)
  66666,           // #13
  133333,          // #14 (中間)
  200000,          // #15
  600000,          // #16 (中間)
  1000000,         // #17
  3500000,         // #18 (中間)
  6000000,         // #19
  75000000,        // #20 (中間)
  144000000,       // #21
  6984000000,      // #22 (中間)
  13824000000,     // #23
  1.06e13,         // #24 (中間)
  2.12e13,         // #25 (21兆)
  1.12e17,         // #26 (中間)
  2.04e17,         // #27 (20京)
  5.52e21,         // #28 (中間)
  1.08e22,         // #29 (100垓)
  5.0e22,          // #30
];

// 後方互換用（非推奨）
export const BASE_RENT = DAILY_QUOTAS[0];
export const RENT_EXPONENT = 1.5;

// デフォルト料理価格（CSVで上書き可能）
export const DEFAULT_FOOD_PRICE = 30;

// ------------------------------------------------------------
// LITトークン設定
// ------------------------------------------------------------

// 初期LIT
export const INITIAL_LIT = 1;

// 1日終了時に獲得するLIT
export const LIT_PER_DAY = 1;

// ------------------------------------------------------------
// ショップ設定
// ------------------------------------------------------------

// ショップに表示するメニュー数
export const SHOP_LINEUP_SIZE = 3;

// ------------------------------------------------------------
// 容量・上限設定
// ------------------------------------------------------------

// メニュー登録枠の上限 - UPGRADEABLE: メニュースロット拡張で増加
export const MAX_MENU_SLOTS = 4;

// 店員スロット数の初期値 - アップグレードで増加
export const MAX_STAFF_SLOTS = 3;

// 座席数 - UPGRADEABLE: テーブル購入で増加
export const SEAT_COUNT = 4;

// 初期店員数
// @deprecated 店長が hiredStaff に含まれるようになったため、この値は使用しない
export const INITIAL_STAFF_COUNT = 0;


// ------------------------------------------------------------
// ヘルパー関数
// ------------------------------------------------------------

// 店員の定位置を取得（インデックスに基づく）
export const getStaffIdlePosition = (staffIndex: number) => ({
  x: REGISTER_POSITION.x + staffIndex * REGISTER_SPACING,
  y: REGISTER_POSITION.y,
});

// スタッフの調理位置を取得（キッチン内、インデックスに基づく）
export const getStaffCookingPosition = (staffIndex: number) => ({
  x: KITCHEN_POSITION.x - 30 + staffIndex * STAFF_SPACING,
  y: KITCHEN_POSITION.y,
});

// 指定日の家賃（ノルマ）を計算
export const calculateRent = (day: number): number => {
  // 配列は0-indexed、dayは1から開始
  const index = day - 1;
  if (index < DAILY_QUOTAS.length) {
    return Math.floor(DAILY_QUOTAS[index]);
  }
  // 配列を超えた場合は最後の値を返す
  return Math.floor(DAILY_QUOTAS[DAILY_QUOTAS.length - 1]);
};

// ------------------------------------------------------------
// アイコンURL設定
// ------------------------------------------------------------
export const ICONS = {
  doria: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f35a.png',
  // 汎用料理アイコン（個別メニューアイコンがない場合に使用）
  meal: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f37d.png',
  // メニューがない時のはてなアイコン
  question: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2753.png',
  staff: {
    movingToKitchen: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c3.png',
    pickingFood: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f373.png',
    delivering: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9d1-200d-1f373.png',
    serving: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f374.png',
  },
  // テーブル上の料理アイコン（カテゴリ別）
  tableMeal: {
    snack: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f35f.png',    // フライドポテト
    main: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f356.png',     // 肉
    dessert: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f368.png',  // アイスクリーム
  },
};

// ------------------------------------------------------------
// 後方互換性のためのエイリアス（deprecated）
// 統合スタッフシステムにより、コックは廃止され
// スタッフが調理・配膳の両方を担当します
// ------------------------------------------------------------
/** @deprecated 統合スタッフシステムでは STAFF_COOKING_SPEED を使用 */
export const COOK_SPEED = STAFF_COOKING_SPEED;
/** @deprecated 統合スタッフシステムでは STAFF_SPACING を使用 */
export const COOK_SPACING = STAFF_SPACING;
/** @deprecated 統合スタッフシステムでは getStaffCookingPosition を使用 */
export const getCookIdlePosition = getStaffCookingPosition;
