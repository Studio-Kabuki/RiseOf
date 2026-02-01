import type { FacilityDef, Shop, StaffDef, MenuAttribute } from './types';
import { getGameData, getFacilityById, getStaffById, rollGacha as dataLoaderRollGacha, rollStaffGacha as dataLoaderRollStaffGacha } from './utils/dataLoader';

// ガチャコスト（LIT）
export const GACHA_COST = 3;

// CSVデータから施設を取得
export function getFacilities(): FacilityDef[] {
  return getGameData()?.facilities ?? [];
}

// CSVデータから人材を取得
export function getStaffList(): StaffDef[] {
  return getGameData()?.staff ?? [];
}

// CSVデータから店舗を取得
export function getInitialShops(): Shop[] {
  const gameData = getGameData();
  if (gameData?.shopsWithMeta) {
    return gameData.shopsWithMeta.map(sm => ({
      ...sm.shop,
      slots: [...sm.shop.slots],
    }));
  }
  return [];
}

// CSVデータから店舗位置を取得
export function getShopPositions(): Record<string, { col: number; row: number }> {
  const gameData = getGameData();
  if (gameData?.shopsWithMeta) {
    const positions: Record<string, { col: number; row: number }> = {};
    gameData.shopsWithMeta.forEach(sm => {
      positions[sm.shop.id] = sm.position;
    });
    return positions;
  }
  return {};
}

// CSVデータからアンロック条件を取得
export function getShopUnlockConditions(): Record<string, { type: string; value: number }> {
  const gameData = getGameData();
  if (gameData?.shopsWithMeta) {
    const conditions: Record<string, { type: string; value: number }> = {};
    gameData.shopsWithMeta.forEach(sm => {
      conditions[sm.shop.id] = sm.unlockCondition;
    });
    return conditions;
  }
  return {};
}

// ヘルパー: IDで施設を検索
export const getFacility = (id: string): FacilityDef | undefined => {
  return getFacilityById(id);
};

// ヘルパー: IDで人材を検索
export const getStaff = (id: string): StaffDef | undefined => {
  return getStaffById(id);
};

// ガチャ：ランダムに3つ選ぶ
export const rollGacha = (): FacilityDef[] => {
  return dataLoaderRollGacha();
};

// 人材ガチャ：ランダムに3つ選ぶ
export const rollStaffGacha = (): StaffDef[] => {
  return dataLoaderRollStaffGacha();
};

// 属性の日本語名
export const ATTRIBUTE_NAMES: Record<MenuAttribute, string> = {
  pasta: 'パスタ',
  sweets: 'スイーツ',
  meat: '肉料理',
  drink: 'ドリンク',
  none: 'なし',
};
