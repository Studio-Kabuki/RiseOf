import { useEffect, useRef } from 'react';
import { Application, Assets, Container } from 'pixi.js';
import { GameEngine } from '../game';
import { useEntityStore, useRestaurantStore } from '../store';
import {
  CustomerSprite,
  StaffSprite,
  CookSprite,
  TableSprite,
  KitchenSprite,
  EntranceSprite,
  RegisterSprite,
} from './sprites';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CUSTOMER_SPAWN_DELAY, ICONS } from '../constants/game';
import { loadMenusFromCSV, getMenuPool } from '../data/menuLoader';

export function RestaurantMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const initializedRef = useRef(false);

  // スプライト管理
  const customerSpritesRef = useRef<Map<string, CustomerSprite>>(new Map());
  const staffSpritesRef = useRef<Map<string, StaffSprite>>(new Map());
  const cookSpritesRef = useRef<Map<string, CookSprite>>(new Map());
  const dynamicContainerRef = useRef<Container | null>(null);
  const kitchenSpriteRef = useRef<KitchenSprite | null>(null);

  // Store
  const { addCustomer, addStaff, addCook } = useEntityStore();
  const { restaurant, assignSeat, getAvailableSeats } = useRestaurantStore();

  // スプライト更新
  const updateSprites = () => {
    const dynamicContainer = dynamicContainerRef.current;
    if (!dynamicContainer) return;

    const customerSprites = customerSpritesRef.current;
    const staffSprites = staffSpritesRef.current;
    const cookSprites = cookSpritesRef.current;

    // 現在のエンティティ状態を取得
    const currentCustomers = useEntityStore.getState().customers;
    const currentStaff = useEntityStore.getState().staff;
    const currentCooks = useEntityStore.getState().cooks;
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

    // Cookスプライト更新
    const cookIds = new Set(currentCooks.map((c) => c.id));

    for (const [id, sprite] of cookSprites) {
      if (!cookIds.has(id)) {
        dynamicContainer.removeChild(sprite);
        sprite.destroy();
        cookSprites.delete(id);
      }
    }

    for (const cook of currentCooks) {
      let sprite = cookSprites.get(cook.id);
      if (!sprite) {
        sprite = new CookSprite();
        dynamicContainer.addChild(sprite);
        cookSprites.set(cook.id, sprite);
      }
      sprite.update(cook);
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

        // CSVからメニューを読み込み
        await loadMenusFromCSV();
        const menuPool = getMenuPool();

        // アイコン画像をプリロード
        // メニュープールの全アイコンと店員アイコンをプリロード
        const menuIconUrls = menuPool.map((menu) => menu.iconUrl);
        const staffIconUrls = [
          ICONS.staff.movingToKitchen,
          ICONS.staff.pickingFood,
          ICONS.staff.delivering,
          ICONS.staff.serving,
        ];
        await Assets.load([...menuIconUrls, ...staffIconUrls]);

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

        // レジエリア
        const registerSprite = new RegisterSprite(4);
        staticContainer.addChild(registerSprite);

        // 動的オブジェクト用コンテナ
        const dynamicContainer = new Container();
        app.stage.addChild(dynamicContainer);
        dynamicContainerRef.current = dynamicContainer;

        // ゲームエンジン開始
        const engine = new GameEngine(app);
        engine.start();
        engineRef.current = engine;

        // 初期スタッフを追加（まだいない場合のみ）
        if (useEntityStore.getState().staff.length === 0) {
          addStaff();
        }

        // 初期コック（キッチンスタッフ）を追加（まだいない場合のみ）
        if (useEntityStore.getState().cooks.length === 0) {
          addCook();
        }

        // 初期お客さんを追加（2人、間隔を開けて）- まだいない場合のみ
        if (useEntityStore.getState().customers.length === 0) {
          const availableSeats = getAvailableSeats();
          if (availableSeats.length >= 1) {
            // 1人目：即座に
            const customerId1 = addCustomer(availableSeats[0].id);
            assignSeat(availableSeats[0].id, customerId1);

            // 2人目：少し遅れて
            if (availableSeats.length >= 2) {
              setTimeout(() => {
                if (destroyed) return;
                const seats = useRestaurantStore.getState().getAvailableSeats();
                if (seats.length > 0) {
                  const customerId2 = useEntityStore.getState().addCustomer(seats[0].id);
                  useRestaurantStore.getState().assignSeat(seats[0].id, customerId2);
                }
              }, CUSTOMER_SPAWN_DELAY * 1000);
            }
          }
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
      cookSpritesRef.current.clear();
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
