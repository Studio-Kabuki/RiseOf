import type { Application, Ticker } from 'pixi.js';
import { CustomerSystem } from './systems/CustomerSystem';
import { StaffSystem } from './systems/StaffSystem';
import { KitchenSystem } from './systems/KitchenSystem';
import { useRestaurantStore } from '../store';

export interface GameSystem {
  update(deltaTime: number): void;
}

export class GameEngine {
  private app: Application;
  private systems: GameSystem[] = [];
  private gameSpeed: number = 1.0;
  private boundUpdate: (ticker: Ticker) => void;

  constructor(app: Application) {
    this.app = app;
    this.boundUpdate = this.update.bind(this);

    // システムを登録
    this.systems.push(new CustomerSystem());
    this.systems.push(new StaffSystem());
    this.systems.push(new KitchenSystem());
  }

  start(): void {
    this.app.ticker.add(this.boundUpdate);
  }

  stop(): void {
    this.app.ticker.remove(this.boundUpdate);
  }

  private update(ticker: Ticker): void {
    const { isPaused, advanceTime } = useRestaurantStore.getState();

    if (isPaused) return;

    const deltaTime = (ticker.deltaMS / 1000) * this.gameSpeed; // 秒単位

    // ゲーム時間を進める
    advanceTime(deltaTime);

    // 各システムを更新
    for (const system of this.systems) {
      system.update(deltaTime);
    }
  }

  setSpeed(speed: number): void {
    this.gameSpeed = speed;
  }
}
