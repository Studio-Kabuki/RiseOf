import type { SeasoningDefinition, SeasoningEffectType, SeasoningParams } from '../types/seasoning';
import { parseParams } from '../utils/csvParser';

// CSVをパースしてSeasoningDefinitionの配列を返す
function parseSeasoningCSV(csvText: string): SeasoningDefinition[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 3) return []; // ヘッダー + 型定義 + データが必要

  // 1行目: カラム名、2行目: 型定義（スキップ）、3行目以降: データ
  const seasonings: SeasoningDefinition[] = [];
  for (let i = 2; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 7) continue;

    // effectType列（6番目の列、インデックス5）
    const effectTypeValue = values[5]?.trim() || 'sales_multiplier';
    const effectType = effectTypeValue as SeasoningEffectType;

    // params列をパース（7番目の列、インデックス6）
    const paramsValue = values[6]?.trim() || '';
    const rawParams = parseParams(paramsValue);

    // SeasoningParams に変換
    const params: SeasoningParams = {
      multiplier: typeof rawParams.multiplier === 'number' ? rawParams.multiplier : undefined,
      stackValue: typeof rawParams.stackValue === 'number' ? rawParams.stackValue : undefined,
    };

    // category_bonus の場合、categoryBonus を設定
    if (effectType === 'category_bonus' && rawParams.category && rawParams.extraMultiplier) {
      params.categoryBonus = {
        category: String(rawParams.category),
        extraMultiplier: typeof rawParams.extraMultiplier === 'number' ? rawParams.extraMultiplier : 1,
      };
    }

    const seasoning: SeasoningDefinition = {
      id: values[0].trim(),
      name: values[1].trim(),
      description: values[2].trim(),
      iconUrl: values[3].trim(),
      cost: parseInt(values[4]?.trim() || '1', 10),
      effectType,
      params,
    };
    seasonings.push(seasoning);
  }

  return seasonings;
}

// シーズニングデータをCSVから読み込む
let cachedSeasonings: SeasoningDefinition[] | null = null;

export async function loadSeasoningsFromCSV(): Promise<SeasoningDefinition[]> {
  if (cachedSeasonings) return cachedSeasonings;

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/seasonings.csv`);
    if (!response.ok) {
      throw new Error(`Failed to load seasonings.csv: ${response.status}`);
    }
    const csvText = await response.text();
    cachedSeasonings = parseSeasoningCSV(csvText);
    return cachedSeasonings;
  } catch (error) {
    console.error('Failed to load seasonings from CSV:', error);
    return [];
  }
}

// キャッシュをクリア（開発用）
export function clearSeasoningCache(): void {
  cachedSeasonings = null;
}

// 同期的にキャッシュからシーズニングを取得（事前にloadSeasoningsFromCSVを呼んでおく必要あり）
export function getSeasoningPool(): SeasoningDefinition[] {
  return cachedSeasonings || [];
}

// ランダムなシーズニングオプションを取得
export function getRandomSeasoningOptions(count: number, excludeIds: string[] = []): SeasoningDefinition[] {
  const pool = getSeasoningPool().filter((s) => !excludeIds.includes(s.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
