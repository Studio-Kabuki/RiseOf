import { useEffect, useRef } from 'react';
import { Application, Container } from 'pixi.js';
import { GameEngine } from '../game';
import { useEntityStore, useRestaurantStore } from '../store';
import {
  CustomerSprite,
  StaffSprite,
  TableSprite,
  KitchenSprite,
  EntranceSprite,
} from './sprites';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants/game';

export function RestaurantMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const initializedRef = useRef(false);

  // スプライト管理
  const customerSpritesRef = useRef<Map<string, CustomerSprite>>(new Map());
  const staffSpritesRef = useRef<Map<string, StaffSprite>>(new Map());
  const dynamicContainerRef = useRef<Container | null>(null);
  const kitchenSpriteRef = useRef<KitchenSprite | null>(null);

  // Store
  const { addCustomer, addStaff } = useEntityStore();
  const { restaurant, assignSeat, getAvailableSeats } = useRestaurantStore();

  // スプライト更新
  const updateSprites = () => {
    const dynamicContainer = dynamicContainerRef.current;
    if (!dynamicContainer) return;

    const customerSprites = customerSpritesRef.current;
    const staffSprites = staffSpritesRef.current;

    // 現在のエンティティ状態を取得
    const currentCustomers = useEntityStore.getState().customers;
    const currentStaff = useEntityStore.getState().staff;
    const currentRestaurant = useRestaurantStore.getState().restaurant;

    // Customerスプライト更新
    const customerIds = new Set(currentCustomers.map((c) => c.id));

    // 不要なスプライトを削除
    for (const [id, sprite] of customerSprites) {
      if (!customerIds.has(id)) {
        dynamicContainer.removeChild(sprite);
        sprite.destroy();
        customerSprites.delete(id);
      }
    }

    // スプライトを更新または作成
    for (const customer of currentCustomers) {
      let sprite = customerSprites.get(customer.id);
      if (!sprite) {
        sprite = new CustomerSprite();
        dynamicContainer.addChild(sprite);
        customerSprites.set(customer.id, sprite);
      }
      sprite.update(customer);
    }

    // Staffスプライト更新
    const staffIds = new Set(currentStaff.map((s) => s.id));

    for (const [id, sprite] of staffSprites) {
      if (!staffIds.has(id)) {
        dynamicContainer.removeChild(sprite);
        sprite.destroy();
        staffSprites.delete(id);
      }
    }

    for (const s of currentStaff) {
      let sprite = staffSprites.get(s.id);
      if (!sprite) {
        sprite = new StaffSprite();
        dynamicContainer.addChild(sprite);
        staffSprites.set(s.id, sprite);
      }
      sprite.update(s);
    }

    // キッチン更新
    if (kitchenSpriteRef.current) {
      kitchenSpriteRef.current.update(currentRestaurant.kitchen);
    }
  };

  // Pixi.js初期化
  useEffect(() => {
    // 既に初期化済みの場合はスキップ
    if (initializedRef.current) return;
    if (!containerRef.current) return;

    initializedRef.current = true;
    let destroyed = false;

    const app = new Application();
    appRef.current = app;

    const init = async () => {
      try {
        await app.init({
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: 0xf5f5dc, // ベージュ
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        // 初期化中にアンマウントされた場合
        if (destroyed) {
          app.destroy(true, { children: true });
          return;
        }

        if (!containerRef.current) return;

        containerRef.current.appendChild(app.canvas);

        // 静的オブジェクト用コンテナ
        const staticContainer = new Container();
        app.stage.addChild(staticContainer);

        // 入口
        const entrance = new EntranceSprite(restaurant.entrancePosition);
        staticContainer.addChild(entrance);

        // テーブル
        for (const table of restaurant.tables) {
          const tableSprite = new TableSprite(table);
          staticContainer.addChild(tableSprite);
        }

        // キッチン
        const kitchenSprite = new KitchenSprite(restaurant.kitchen);
        staticContainer.addChild(kitchenSprite);
        kitchenSpriteRef.current = kitchenSprite;

        // 動的オブジェクト用コンテナ
        const dynamicContainer = new Container();
        app.stage.addChild(dynamicContainer);
        dynamicContainerRef.current = dynamicContainer;

        // ゲームエンジン開始
        const engine = new GameEngine(app);
        engine.start();
        engineRef.current = engine;

        // 初期スタッフを追加
        addStaff();

        // 初期お客さんを追加（2人）
        const availableSeats = getAvailableSeats();
        if (availableSeats.length >= 2) {
          const customerId1 = addCustomer(availableSeats[0].id);
          assignSeat(availableSeats[0].id, customerId1);

          const customerId2 = addCustomer(availableSeats[1].id);
          assignSeat(availableSeats[1].id, customerId2);
        }

        // スプライト更新ループ
        app.ticker.add(updateSprites);
      } catch (error) {
        console.error('Failed to initialize Pixi.js:', error);
      }
    };

    init();

    return () => {
      destroyed = true;
      initializedRef.current = false; // リセット
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      if (appRef.current && appRef.current.renderer) {
        try {
          appRef.current.destroy(true, { children: true });
        } catch {
          // Ignore destroy errors
        }
        appRef.current = null;
      }
      // スプライトマップをクリア
      customerSpritesRef.current.clear();
      staffSpritesRef.current.clear();
      dynamicContainerRef.current = null;
      kitchenSpriteRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        border: '2px solid #333',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
}
