import type { GameEvent, EventEffectType, EventEffectTarget } from '../types/event';

// CSVをパースしてGameEventの配列を返す
function parseEventCSV(csvText: string): GameEvent[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 3) return []; // ヘッダー + 型定義 + データが必要

  const events: GameEvent[] = [];
  for (let i = 2; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 6) continue;

    const event: GameEvent = {
      id: values[0].trim(),
      name: values[1].trim(),
      description: values[2].trim(),
      effectType: values[3].trim() as EventEffectType,
      effectTarget: values[4].trim() as EventEffectTarget,
      effectValue: parseFloat(values[5]) || 0,
    };
    events.push(event);
  }

  return events;
}

// イベントをCSVから読み込む
let cachedEvents: GameEvent[] | null = null;

export async function loadEventsFromCSV(): Promise<GameEvent[]> {
  if (cachedEvents) return cachedEvents;

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/events.csv`);
    if (!response.ok) {
      throw new Error(`Failed to load events.csv: ${response.status}`);
    }
    const csvText = await response.text();
    cachedEvents = parseEventCSV(csvText);
    return cachedEvents;
  } catch (error) {
    console.error('Failed to load events from CSV:', error);
    return [];
  }
}

// キャッシュをクリア（開発用）
export function clearEventCache(): void {
  cachedEvents = null;
}

// 同期的にキャッシュからイベントを取得
export function getEventPool(): GameEvent[] {
  return cachedEvents || [];
}

// ランダムにイベントを1つ選ぶ
export function getRandomEvent(): GameEvent | null {
  const events = getEventPool();
  if (events.length === 0) return null;
  const index = Math.floor(Math.random() * events.length);
  return events[index];
}
