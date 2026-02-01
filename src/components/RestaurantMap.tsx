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
import { CANVAS_WIDTH, CANVAS_HEIGHT, ICONS } from '../constants/game';
import { loadMenusFromCSV, getMenuPool } from '../data/menuLoader';

// カメラ制御の定数
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_SPEED = 0.001;

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

  // カメラ制御用
  const worldContainerRef = useRef<Container | null>(null);
  const cameraStateRef = useRef({
    scale: 1,
    x: 0,
    y: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    // ピンチズーム用
    lastPinchDistance: 0,
  });

  // Store
  const { addStaff, addCook } = useEntityStore();
  const { restaurant } = useRestaurantStore();

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

        // CSVからメニューを読み込み（TitleScreenで既にロード済みだがキャッシュから取得）
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

        // ワールドコンテナ（カメラ制御用）
        const worldContainer = new Container();
        app.stage.addChild(worldContainer);
        worldContainerRef.current = worldContainer;

        // 静的オブジェクト用コンテナ
        const staticContainer = new Container();
        worldContainer.addChild(staticContainer);

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
        worldContainer.addChild(dynamicContainer);
        dynamicContainerRef.current = dynamicContainer;

        // カメラ制御のイベントハンドラー
        const canvas = app.canvas;
        const camera = cameraStateRef.current;

        // ズーム適用関数
        const applyCamera = () => {
          if (!worldContainerRef.current) return;
          const wc = worldContainerRef.current;
          wc.scale.set(camera.scale);
          wc.x = camera.x;
          wc.y = camera.y;
        };

        // マウスホイールでズーム
        const handleWheel = (e: WheelEvent) => {
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          // ズーム前のワールド座標
          const worldX = (mouseX - camera.x) / camera.scale;
          const worldY = (mouseY - camera.y) / camera.scale;

          // ズーム量を計算
          const zoomDelta = -e.deltaY * ZOOM_SPEED;
          const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.scale + zoomDelta));

          // ズーム後もマウス位置のワールド座標が同じになるように調整
          camera.scale = newScale;
          camera.x = mouseX - worldX * newScale;
          camera.y = mouseY - worldY * newScale;

          applyCamera();
        };

        // マウスドラッグでパン
        const handleMouseDown = (e: MouseEvent) => {
          camera.isDragging = true;
          camera.lastX = e.clientX;
          camera.lastY = e.clientY;
          canvas.style.cursor = 'grabbing';
        };

        const handleMouseMove = (e: MouseEvent) => {
          if (!camera.isDragging) return;
          const dx = e.clientX - camera.lastX;
          const dy = e.clientY - camera.lastY;
          camera.x += dx;
          camera.y += dy;
          camera.lastX = e.clientX;
          camera.lastY = e.clientY;
          applyCamera();
        };

        const handleMouseUp = () => {
          camera.isDragging = false;
          canvas.style.cursor = 'grab';
        };

        // タッチイベント（ピンチズーム・ドラッグ）
        const getTouchDistance = (touches: TouchList) => {
          if (touches.length < 2) return 0;
          const dx = touches[0].clientX - touches[1].clientX;
          const dy = touches[0].clientY - touches[1].clientY;
          return Math.sqrt(dx * dx + dy * dy);
        };

        const getTouchCenter = (touches: TouchList, rect: DOMRect) => {
          if (touches.length < 2) {
            return { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
          }
          return {
            x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
            y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
          };
        };

        const handleTouchStart = (e: TouchEvent) => {
          if (e.touches.length === 1) {
            camera.isDragging = true;
            camera.lastX = e.touches[0].clientX;
            camera.lastY = e.touches[0].clientY;
          } else if (e.touches.length === 2) {
            camera.lastPinchDistance = getTouchDistance(e.touches);
          }
        };

        const handleTouchMove = (e: TouchEvent) => {
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();

          if (e.touches.length === 1 && camera.isDragging) {
            // シングルタッチでパン
            const dx = e.touches[0].clientX - camera.lastX;
            const dy = e.touches[0].clientY - camera.lastY;
            camera.x += dx;
            camera.y += dy;
            camera.lastX = e.touches[0].clientX;
            camera.lastY = e.touches[0].clientY;
            applyCamera();
          } else if (e.touches.length === 2) {
            // ピンチズーム
            const newDistance = getTouchDistance(e.touches);
            if (camera.lastPinchDistance > 0) {
              const center = getTouchCenter(e.touches, rect);
              const worldX = (center.x - camera.x) / camera.scale;
              const worldY = (center.y - camera.y) / camera.scale;

              const zoomFactor = newDistance / camera.lastPinchDistance;
              const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.scale * zoomFactor));

              camera.scale = newScale;
              camera.x = center.x - worldX * newScale;
              camera.y = center.y - worldY * newScale;

              applyCamera();
            }
            camera.lastPinchDistance = newDistance;
          }
        };

        const handleTouchEnd = (e: TouchEvent) => {
          if (e.touches.length === 0) {
            camera.isDragging = false;
            camera.lastPinchDistance = 0;
          } else if (e.touches.length === 1) {
            camera.lastX = e.touches[0].clientX;
            camera.lastY = e.touches[0].clientY;
            camera.lastPinchDistance = 0;
          }
        };

        // イベントリスナー登録
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);

        canvas.style.cursor = 'grab';
        canvas.style.touchAction = 'none';

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

        // お客さんは CustomerSystem が isOpen 時に自動スポーンする

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
      worldContainerRef.current = null;
      // カメラ状態をリセット
      cameraStateRef.current = {
        scale: 1,
        x: 0,
        y: 0,
        isDragging: false,
        lastX: 0,
        lastY: 0,
        lastPinchDistance: 0,
      };
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        border: '2px solid #333',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    />
  );
}
