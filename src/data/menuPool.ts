import type { MenuItem } from '../types';

// メニュー全体プール（サイゼリヤ風）
export const MENU_POOL: MenuItem[] = [
  // パスタ
  {
    id: 'spaghetti',
    name: 'ミートソース',
    price: 400,
    cookingTime: 4,
    iconUrl: 'https://img.icons8.com/fluency/48/spaghetti.png',
  },
  {
    id: 'carbonara',
    name: 'カルボナーラ',
    price: 500,
    cookingTime: 5,
    iconUrl: 'https://img.icons8.com/fluency/48/pasta.png',
  },
  {
    id: 'peperoncino',
    name: 'ペペロンチーノ',
    price: 350,
    cookingTime: 3,
    iconUrl: 'https://img.icons8.com/fluency/48/noodles.png',
  },
  // ドリア・グラタン
  {
    id: 'doria',
    name: 'ミラノ風ドリア',
    price: 300,
    cookingTime: 3,
    iconUrl: 'https://img.icons8.com/fluency/48/rice-bowl.png',
  },
  {
    id: 'gratin',
    name: 'シーフードグラタン',
    price: 450,
    cookingTime: 5,
    iconUrl: 'https://img.icons8.com/fluency/48/hot-pot.png',
  },
  // ピザ
  {
    id: 'margherita',
    name: 'マルゲリータ',
    price: 400,
    cookingTime: 4,
    iconUrl: 'https://img.icons8.com/fluency/48/pizza.png',
  },
  {
    id: 'quattro',
    name: 'クワトロフォルマッジ',
    price: 550,
    cookingTime: 5,
    iconUrl: 'https://img.icons8.com/fluency/48/cheese.png',
  },
  // サラダ・前菜
  {
    id: 'salad',
    name: 'グリーンサラダ',
    price: 200,
    cookingTime: 1,
    iconUrl: 'https://img.icons8.com/fluency/48/salad.png',
  },
  {
    id: 'soup',
    name: 'コーンスープ',
    price: 150,
    cookingTime: 2,
    iconUrl: 'https://img.icons8.com/fluency/48/soup-plate.png',
  },
  // 肉料理
  {
    id: 'hamburg',
    name: 'ハンバーグ',
    price: 500,
    cookingTime: 6,
    iconUrl: 'https://img.icons8.com/fluency/48/steak.png',
  },
  {
    id: 'chicken',
    name: 'チキンステーキ',
    price: 450,
    cookingTime: 5,
    iconUrl: 'https://img.icons8.com/fluency/48/chicken-leg.png',
  },
  // デザート
  {
    id: 'tiramisu',
    name: 'ティラミス',
    price: 300,
    cookingTime: 1,
    iconUrl: 'https://img.icons8.com/fluency/48/cake.png',
  },
  {
    id: 'gelato',
    name: 'ジェラート',
    price: 200,
    cookingTime: 1,
    iconUrl: 'https://img.icons8.com/fluency/48/ice-cream-cone.png',
  },
  // ドリンク
  {
    id: 'coffee',
    name: 'コーヒー',
    price: 100,
    cookingTime: 1,
    iconUrl: 'https://img.icons8.com/fluency/48/coffee-to-go.png',
  },
  {
    id: 'wine',
    name: 'グラスワイン',
    price: 200,
    cookingTime: 1,
    iconUrl: 'https://img.icons8.com/fluency/48/wine-glass.png',
  },
];

// プールからランダムにN個選ぶ（選択済みを除外）
export function getRandomMenuOptions(
  count: number,
  excludeIds: string[] = []
): MenuItem[] {
  const available = MENU_POOL.filter((m) => !excludeIds.includes(m.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
