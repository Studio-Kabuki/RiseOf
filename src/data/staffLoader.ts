import type { StaffDefinition, StaffAbilityType, StaffParams } from '../types/staffDefinition';
import { parseParams } from '../utils/csvParser';

// CSVをパースしてStaffDefinitionの配列を返す
function parseStaffCSV(csvText: string): StaffDefinition[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 3) return []; // ヘッダー + 型定義 + データが必要

  // 1行目: カラム名、2行目: 型定義（スキップ）、3行目以降: データ
  const staffs: StaffDefinition[] = [];
  for (let i = 2; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 7) continue;

    // ability列（4番目の列、インデックス3）
    const abilityValue = values[3]?.trim() || 'none';
    const ability = abilityValue as StaffAbilityType;

    // params列をパース（5番目の列、インデックス4）
    const paramsValue = values[4]?.trim() || '';
    const params: StaffParams = parseParams(paramsValue);

    // description列（6番目の列、インデックス5）
    const description = values[5]?.trim() || '';

    // cost列（7番目の列、インデックス6）
    const cost = parseInt(values[6]?.trim() || '1', 10);

    const staff: StaffDefinition = {
      id: values[0].trim(),
      name: values[1].trim(),
      iconUrl: values[2].trim(),
      ability,
      params,
      description,
      cost,
    };
    staffs.push(staff);
  }

  return staffs;
}

// 店員データをCSVから読み込む
let cachedStaffs: StaffDefinition[] | null = null;

export async function loadStaffsFromCSV(): Promise<StaffDefinition[]> {
  if (cachedStaffs) return cachedStaffs;

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/staffs.csv`);
    if (!response.ok) {
      throw new Error(`Failed to load staffs.csv: ${response.status}`);
    }
    const csvText = await response.text();
    cachedStaffs = parseStaffCSV(csvText);
    return cachedStaffs;
  } catch (error) {
    console.error('Failed to load staffs from CSV:', error);
    return [];
  }
}

// キャッシュをクリア（開発用）
export function clearStaffCache(): void {
  cachedStaffs = null;
}

// 同期的にキャッシュからスタッフを取得（事前にloadStaffsFromCSVを呼んでおく必要あり）
export function getStaffPool(): StaffDefinition[] {
  return cachedStaffs || [];
}
