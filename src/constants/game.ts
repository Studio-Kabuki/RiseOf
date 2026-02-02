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
export const EATING_TIME = 10;

// デフォルト調理時間（秒）- 料理ごとに個別設定も可能
export const COOKING_TIME = 3;

// ------------------------------------------------------------
// 移動速度設定 (px/秒)
// ------------------------------------------------------------

// お客さんの移動速度 - UPGRADEABLE: 椅子の快適さで変化?
export const CUSTOMER_SPEED = 80;

// 店員の移動速度 - UPGRADEABLE: 店員のレベルアップで向上
export const STAFF_SPEED = 120;

// スタッフの調理時移動速度（キッチン内での動き）
export const STAFF_COOKING_SPEED = 100;

// ------------------------------------------------------------
// 経済・ノルマ設定
// ------------------------------------------------------------

// 基本家賃（Day1のノルマ）
export const BASE_RENT = 100;

// 家賃の増加指数（毎日この乗数で増加: Day N の家賃 = BASE_RENT * N^RENT_EXPONENT）
export const RENT_EXPONENT = 1.5;

// デフォルト料理価格（CSVで上書き可能）
export const DEFAULT_FOOD_PRICE = 30;

// ------------------------------------------------------------
// LITトークン設定
// ------------------------------------------------------------

// 初期LIT
export const INITIAL_LIT = 2;

// 1日終了時に獲得するLIT
export const LIT_PER_DAY = 5;

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

// 座席数 - UPGRADEABLE: テーブル購入で増加
export const SEAT_COUNT = 4;

// 店員数 - UPGRADEABLE: 店員雇用で増加
export const INITIAL_STAFF_COUNT = 1;


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
  return Math.floor(BASE_RENT * Math.pow(day, RENT_EXPONENT));
};

// ------------------------------------------------------------
// アイコンURL設定
// ------------------------------------------------------------
export const ICONS = {
  doria: 'https://img.icons8.com/fluency/48/rice-bowl.png',
  // 汎用料理アイコン（個別メニューアイコンがない場合に使用）
  meal: 'https://img.icons8.com/fluency/48/meal.png',
  // メニューがない時のはてなアイコン
  question: 'https://img.icons8.com/fluency/48/help.png',
  staff: {
    movingToKitchen: 'https://img.icons8.com/fluency/48/running.png',
    pickingFood: 'https://img.icons8.com/fluency/48/cooking-pot.png',
    delivering: 'https://img.icons8.com/fluency/48/waiter.png',
    serving: 'https://img.icons8.com/fluency/48/restaurant.png',
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
