import type { MenuItem, MenuCategory } from '../types';

// CSVをパースしてMenuItemの配列を返す
function parseMenuCSV(csvText: string): MenuItem[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 3) return []; // ヘッダー + 型定義 + データが必要

  // 1行目: カラム名、2行目: 型定義（スキップ）、3行目以降: データ
  const headers = lines[0].split(',');

  const menus: MenuItem[] = [];
  for (let i = 2; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;

    // category列（6番目の列、インデックス5）
    const categoryValue = values[5]?.trim() || 'main';
    const category = categoryValue as MenuCategory;

    // hiddenCategory列（7番目の列、インデックス6）
    const hiddenCategory = values[6]?.trim() || undefined;

    // description列（8番目の列、インデックス7）- \nを改行に変換
    const descriptionRaw = values[7]?.trim() || '';
    const description = descriptionRaw.replace(/\\n/g, '\n');

    const menu: MenuItem = {
      id: values[0],
      name: values[1],
      price: parseInt(values[2], 10),
      cookingTime: parseInt(values[3], 10),
      iconUrl: values[4],
      category,
      hiddenCategory: hiddenCategory || undefined,
      description: description || undefined,
    };
    menus.push(menu);
  }

  return menus;
}

// メニューをCSVから読み込む
let cachedMenus: MenuItem[] | null = null;

export async function loadMenusFromCSV(): Promise<MenuItem[]> {
  if (cachedMenus) return cachedMenus;

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/menus.csv`);
    if (!response.ok) {
      throw new Error(`Failed to load menus.csv: ${response.status}`);
    }
    const csvText = await response.text();
    cachedMenus = parseMenuCSV(csvText);
    return cachedMenus;
  } catch (error) {
    console.error('Failed to load menus from CSV:', error);
    return [];
  }
}

// キャッシュをクリア（開発用）
export function clearMenuCache(): void {
  cachedMenus = null;
}

// 同期的にキャッシュからメニューを取得（事前にloadMenusFromCSVを呼んでおく必要あり）
export function getMenuPool(): MenuItem[] {
  return cachedMenus || [];
}
