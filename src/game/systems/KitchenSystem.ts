import type { GameSystem } from '../GameEngine';

/**
 * キッチンシステム（レガシー互換性用スタブ）
 *
 * 注意: 調理機能はStaffSystemに統合されました。
 * このクラスはGameEngineとの互換性のために残されています。
 * 将来的に削除する場合はGameEngine.tsからの参照も削除してください。
 */
export class KitchenSystem implements GameSystem {
  update(_deltaTime: number): void {
    // 調理機能はStaffSystemに移行済み
    // このメソッドは互換性のために空実装として残す
  }
}
