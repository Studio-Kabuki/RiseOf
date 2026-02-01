import { loadCSV } from './csvParser';
import type { FacilityDef, Shop, ShopStatus, StaffDef, MenuAttribute, StaffEffectType } from '../types';

// CSVから読み込む生データの型
interface RawFacility {
  disabled: number;
  id: string;
  name: string;
  icon: string;
  incomeMoney: number;
  incomeLit: number;
  rarity: string;
  attribute: string;
}

interface RawShop {
  disabled: number;
  id: string;
  name: string;
  status: string;
  unlockCost: number;
  slotCount: number;
  posCol: number;
  posRow: number;
  unlockCondition: string;
  unlockValue: number;
}

interface RawStaff {
  disabled: number;
  id: string;
  name: string;
  icon: string;
  effectType: string;
  effectValue: number;
  targetAttribute: string;
  rarity: string;
}

// 店舗の位置情報
export interface ShopPosition {
  col: number;
  row: number;
}

// 店舗のアンロック条件
export interface ShopUnlockCondition {
  type: 'none' | 'lit' | 'money' | 'day';
  value: number;
}

// 拡張店舗データ（位置とアンロック条件を含む）
export interface ShopWithMeta {
  shop: Shop;
  position: ShopPosition;
  unlockCondition: ShopUnlockCondition;
}

// RawFacility → FacilityDef 変換
function convertToFacility(raw: RawFacility): FacilityDef {
  const income: { money?: number; lit?: number } = {};
  if (raw.incomeMoney > 0) income.money = raw.incomeMoney;
  if (raw.incomeLit > 0) income.lit = raw.incomeLit;

  // 属性をパース
  const validAttributes: MenuAttribute[] = ['pasta', 'sweets', 'meat', 'drink', 'none'];
  const attribute: MenuAttribute = validAttributes.includes(raw.attribute as MenuAttribute)
    ? (raw.attribute as MenuAttribute)
    : 'none';

  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon,
    income,
    rarity: raw.rarity as 'common' | 'rare' | 'epic',
    attribute,
  };
}

// RawShop → ShopWithMeta 変換
function convertToShopWithMeta(raw: RawShop): ShopWithMeta {
  const slots: null[] = Array(raw.slotCount).fill(null);

  return {
    shop: {
      id: raw.id,
      name: raw.name,
      status: raw.status as ShopStatus,
      unlockCost: raw.unlockCost,
      slots,
      staff: null,  // 人材スロットは初期状態で空
    },
    position: {
      col: raw.posCol,
      row: raw.posRow,
    },
    unlockCondition: {
      type: raw.unlockCondition ? (raw.unlockCondition as 'lit' | 'money' | 'day') : 'none',
      value: raw.unlockValue || 0,
    },
  };
}

// RawStaff → StaffDef 変換
function convertToStaff(raw: RawStaff): StaffDef {
  const validEffectTypes: StaffEffectType[] = [
    'shop_money_mult', 'attribute_money_mult', 'shop_lit_mult', 'attribute_lit_mult'
  ];
  const effectType: StaffEffectType = validEffectTypes.includes(raw.effectType as StaffEffectType)
    ? (raw.effectType as StaffEffectType)
    : 'shop_money_mult';

  const validAttributes: MenuAttribute[] = ['pasta', 'sweets', 'meat', 'drink', 'none'];
  const targetAttribute: MenuAttribute | undefined =
    raw.targetAttribute && validAttributes.includes(raw.targetAttribute as MenuAttribute)
      ? (raw.targetAttribute as MenuAttribute)
      : undefined;

  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon,
    effectType,
    effectValue: raw.effectValue,
    targetAttribute,
    rarity: raw.rarity as 'common' | 'rare' | 'epic',
  };
}

// ゲームデータ
export interface GameData {
  facilities: FacilityDef[];
  shopsWithMeta: ShopWithMeta[];
  staff: StaffDef[];
}

// データローダー
export async function loadGameData(): Promise<GameData> {
  const [rawFacilities, rawShops, rawStaff] = await Promise.all([
    loadCSV<RawFacility>('/data/facilities.csv'),
    loadCSV<RawShop>('/data/shops.csv'),
    loadCSV<RawStaff>('/data/staff.csv'),
  ]);

  // disabled=1のデータを除外
  const enabledFacilities = rawFacilities.filter(raw => !raw.disabled || raw.disabled === 0);
  const enabledShops = rawShops.filter(raw => !raw.disabled || raw.disabled === 0);
  const enabledStaff = rawStaff.filter(raw => !raw.disabled || raw.disabled === 0);

  const facilities = enabledFacilities.map(convertToFacility);
  const shopsWithMeta = enabledShops.map(convertToShopWithMeta);
  const staff = enabledStaff.map(convertToStaff);

  return {
    facilities,
    shopsWithMeta,
    staff,
  };
}

// ゲームデータのグローバルインスタンス（ロード後に設定）
let gameDataCache: GameData | null = null;

export function getGameData(): GameData | null {
  return gameDataCache;
}

export function setGameData(data: GameData): void {
  gameDataCache = data;
}

// 施設をIDで検索
export function getFacilityById(id: string): FacilityDef | undefined {
  return gameDataCache?.facilities.find(f => f.id === id);
}

// 人材をIDで検索
export function getStaffById(id: string): StaffDef | undefined {
  return gameDataCache?.staff.find(s => s.id === id);
}

// ガチャ: ランダムに3つ選ぶ
export function rollGacha(): FacilityDef[] {
  if (!gameDataCache) return [];
  const shuffled = [...gameDataCache.facilities].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// 人材ガチャ: ランダムに3つ選ぶ
export function rollStaffGacha(): StaffDef[] {
  if (!gameDataCache) return [];
  const shuffled = [...gameDataCache.staff].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
