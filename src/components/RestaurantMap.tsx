import { useEffect, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, TextureSource } from 'pixi.js';
import { GameEngine } from '../game';
import { useEntityStore, useRestaurantStore } from '../store';
import {
  CustomerSprite,
  StaffSprite,
  KitchenSprite,
} from './sprites';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ICONS } from '../constants/game';
import { loadMenusFromCSV, getMenuPool } from '../data/menuLoader';
import { parseTmxFile, initCollisionFromTmx } from '../utils/tmxParser';
import { parseTmxForRendering, loadTilesetTextures, renderTmxMap } from '../utils/tmxRenderer';
import { getGridInfo, onDebugCollisionChange, isDebugCollisionVisible } from '../utils/pathfinding';
import { usePostEffects } from '../hooks/usePostEffects';
import { PostEffectDebugPanel } from './ui/PostEffectDebugPanel';

// カメラ制御の定数
const MIN_ZOOM = 0.3; // より広い視野でズームアウト可能
const MAX_ZOOM = 2.0;
const ZOOM_SPEED = 0.001;

export function RestaurantMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const initializedRef = useRef(false);

  // ポストエフェクト用のアプリ状態（フック用）
  const [pixiApp, setPixiApp] = useState<Application | null>(null);
  const postEffects = usePostEffects(pixiApp);

  // スプライト管理
  const customerSpritesRef = useRef<Map<string, CustomerSprite>>(new Map());
  const staffSpritesRef = useRef<Map<string, StaffSprite>>(new Map());
  const dynamicContainerRef = useRef<Container | null>(null);
  const kitchenSpriteRef = useRef<KitchenSprite | null>(null);

  // カメラ制御用
  const worldContainerRef = useRef<Container | null>(null);
  // デバッグ表示用
  const debugGraphicsRef = useRef<Graphics | null>(null);
  const debugUnsubscribeRef = useRef<(() => void) | null>(null);
  // テーブルコンテナ参照（解放レベルによる表示切替用）
  const tableContainersRef = useRef<Map<number, Container> | null>(null);
  const tableUnsubscribeRef = useRef<(() => void) | null>(null);
  const cameraStateRef = useRef({
    scale: MIN_ZOOM, // 最もズームアウトした状態をデフォルトに
    x: 0,
    y: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    // ピンチズーム用
    lastPinchDistance: 0,
  });

  // Store
  const { addStaff } = useEntityStore();
  const { restaurant, setTables, setStaffPositions, setSpawnPoints } = useRestaurantStore();

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

    // ドット絵をシャープに表示するため、テクスチャ補間を無効化
    TextureSource.defaultOptions.scaleMode = 'nearest';

    const app = new Application();
    appRef.current = app;

    const init = async () => {
      try {
        await app.init({
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: 0xffffff,
          resolution: 1, // ピクセル等倍（ボケ防止）
          autoDensity: false,
        });

        // 初期化中にアンマウントされた場合
        if (destroyed) {
          app.destroy(true, { children: true });
          return;
        }

        // デバッグ: キャンバスサイズを出力
        console.log('[Canvas Debug]', {
          logicalSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
          physicalSize: { width: app.canvas.width, height: app.canvas.height },
          cssSize: { width: app.canvas.style.width, height: app.canvas.style.height },
          devicePixelRatio: window.devicePixelRatio,
          resolution: app.renderer.resolution,
        });

        // CSVからメニューを読み込み（TitleScreenで既にロード済みだがキャッシュから取得）
        await loadMenusFromCSV();
        const menuPool = getMenuPool();

        // アイコン画像をプリロード
        const menuIconUrls = menuPool.map((menu) => menu.iconUrl);
        const staffIconUrls = [
          ICONS.meal,
          ICONS.question,
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

        // TMXファイルからマップを読み込み・描画
        try {
          // TMXをパースしてレンダリングデータを取得
          const tmxRenderData = await parseTmxForRendering(`${import.meta.env.BASE_URL}tilemap/diner.tmx`);
          // タイルセット画像をロード
          await loadTilesetTextures(tmxRenderData.tilesets);
          // TMXマップを描画（ネイティブサイズ）
          const tmxRenderResult = renderTmxMap(tmxRenderData);
          const tmxMapContainer = tmxRenderResult.container;
          worldContainer.addChild(tmxMapContainer);
          // テーブルコンテナへの参照を保存
          tableContainersRef.current = tmxRenderResult.tableContainers;
          console.log('[TMX] Rendered tilemap');

          // テーブル・座席情報も取得
          const tmxData = await parseTmxFile(`${import.meta.env.BASE_URL}tilemap/diner.tmx`);

          // コリジョングリッドを初期化
          initCollisionFromTmx(tmxData);

          // マップサイズを取得してキャンバスに収まるスケールを計算
          const mapWidth = tmxMapContainer.width;
          const mapHeight = tmxMapContainer.height;
          const fitScale = Math.min(CANVAS_WIDTH / mapWidth, CANVAS_HEIGHT / mapHeight);

          console.log('[Map Debug]', {
            mapWidth,
            mapHeight,
            fitScale,
            canvasWidth: CANVAS_WIDTH,
            canvasHeight: CANVAS_HEIGHT,
          });

          // カメラのスケールを設定（マップ全体が見えるように）
          const camera = cameraStateRef.current;
          camera.scale = fitScale;
          worldContainer.scale.set(camera.scale);

          // camera_centerがキャンバス中央に来るように配置
          if (tmxData.cameraCenter) {
            camera.x = Math.round(CANVAS_WIDTH / 2 - tmxData.cameraCenter.x * camera.scale);
            camera.y = Math.round(CANVAS_HEIGHT / 2 - tmxData.cameraCenter.y * camera.scale);
            console.log('[Camera] Using camera_center:', tmxData.cameraCenter, 'result:', { x: camera.x, y: camera.y });
          } else {
            // フォールバック：マップを中央に配置
            camera.x = Math.round((CANVAS_WIDTH - mapWidth * camera.scale) / 2);
            camera.y = Math.round((CANVAS_HEIGHT - mapHeight * camera.scale) / 2);
          }
          worldContainer.x = camera.x;
          worldContainer.y = camera.y;
          if (tmxData.tables.length > 0) {
            setTables(tmxData.tables);
            console.log('[TMX] Loaded tables from TMX:', tmxData.tables);
          }
          // スタッフ位置とスポーン位置を設定
          if (tmxData.staffPositions.length > 0) {
            setStaffPositions(tmxData.staffPositions);
            console.log('[TMX] Loaded staff positions:', tmxData.staffPositions);
          }
          if (tmxData.spawnPoints.length > 0) {
            setSpawnPoints(tmxData.spawnPoints);
            console.log('[TMX] Loaded spawn points:', tmxData.spawnPoints);
          }

          // テーブル表示を解放レベルに応じて更新する関数
          const updateTableVisibility = (unlockLevel: number) => {
            const containers = tableContainersRef.current;
            if (!containers) return;
            containers.forEach((container, index) => {
              container.visible = index <= unlockLevel;
            });
            console.log(`[TMX] Table visibility updated: unlockLevel=${unlockLevel}`);
          };

          // 初期表示を設定
          const initialUnlockLevel = useRestaurantStore.getState().tableUnlockLevel;
          updateTableVisibility(initialUnlockLevel);

          // tableUnlockLevelの変更を監視
          let prevUnlockLevel = initialUnlockLevel;
          tableUnsubscribeRef.current = useRestaurantStore.subscribe((state) => {
            if (state.tableUnlockLevel !== prevUnlockLevel) {
              prevUnlockLevel = state.tableUnlockLevel;
              updateTableVisibility(state.tableUnlockLevel);
            }
          });
        } catch (tmxError) {
          console.error('[TMX] Failed to load TMX:', tmxError);
        }

        // キッチン（完成料理のアイコン表示用）
        const kitchenSprite = new KitchenSprite(restaurant.kitchen);
        worldContainer.addChild(kitchenSprite);
        kitchenSpriteRef.current = kitchenSprite;

        // 動的オブジェクト用コンテナ
        const dynamicContainer = new Container();
        worldContainer.addChild(dynamicContainer);
        dynamicContainerRef.current = dynamicContainer;

        // デバッグ表示用Graphics
        const debugGraphics = new Graphics();
        debugGraphics.visible = isDebugCollisionVisible();
        worldContainer.addChild(debugGraphics);
        debugGraphicsRef.current = debugGraphics;

        // コリジョングリッドを描画する関数
        const drawCollisionGrid = () => {
          debugGraphics.clear();
          const gridInfo = getGridInfo();
          if (!gridInfo.grid.length) return;

          for (let gy = 0; gy < gridInfo.height; gy++) {
            for (let gx = 0; gx < gridInfo.width; gx++) {
              const isCollision = gridInfo.grid[gy]?.[gx];
              const x = gx * gridInfo.cellSize + gridInfo.offsetX;
              const y = gy * gridInfo.cellSize + gridInfo.offsetY;

              if (isCollision) {
                // コリジョンセルは赤で表示
                debugGraphics.rect(x, y, gridInfo.cellSize, gridInfo.cellSize);
                debugGraphics.fill({ color: 0xff0000, alpha: 0.4 });
              } else {
                // 通行可能セルはグリッド線のみ
                debugGraphics.rect(x, y, gridInfo.cellSize, gridInfo.cellSize);
                debugGraphics.stroke({ color: 0x00ff00, alpha: 0.1, width: 0.5 });
              }
            }
          }

          // 配膳位置を青で表示
          const currentRestaurant = useRestaurantStore.getState().restaurant;
          const cellSize = gridInfo.cellSize;

          for (const table of currentRestaurant.tables) {
            for (const seat of table.seats) {
              // 座席のワールド座標を計算
              const seatX = table.position.x + seat.localPosition.x;
              const seatY = table.position.y + seat.localPosition.y;

              // directionに基づいて配膳位置を計算（1 + servingOffset マス先）
              const servingDist = cellSize * (1 + (seat.servingOffset ?? 0));
              let servingX = seatX;
              let servingY = seatY;

              if (seat.direction) {
                switch (seat.direction) {
                  case 'left':
                    servingX = seatX - servingDist;
                    break;
                  case 'right':
                    servingX = seatX + servingDist;
                    break;
                  case 'up':
                    servingY = seatY - servingDist;
                    break;
                  case 'down':
                    servingY = seatY + servingDist;
                    break;
                }
              }

              // 配膳位置を青い円で表示（実際の座標）
              debugGraphics.circle(servingX, servingY, 6);
              debugGraphics.fill({ color: 0x0000ff, alpha: 0.7 });

              // 座席位置を緑の円で表示（実際の座標）
              debugGraphics.circle(seatX, seatY, 6);
              debugGraphics.fill({ color: 0x00ff00, alpha: 0.7 });

              // 座席から配膳位置への線を描画
              debugGraphics.moveTo(seatX, seatY);
              debugGraphics.lineTo(servingX, servingY);
              debugGraphics.stroke({ color: 0x0000ff, alpha: 0.5, width: 2 });
            }
          }
        };

        // 初回描画
        if (debugGraphics.visible) {
          drawCollisionGrid();
        }

        // デバッグ表示切り替えリスナー
        debugUnsubscribeRef.current = onDebugCollisionChange((visible) => {
          debugGraphics.visible = visible;
          if (visible) {
            drawCollisionGrid();
          }
        });

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

        // ポストエフェクト用にアプリ状態を更新
        setPixiApp(app);

        // 初期スタッフを追加（まだいない場合のみ）
        // スタッフは調理と配膳の両方を担当（CookとStaffを統合）
        if (useEntityStore.getState().staff.length === 0) {
          addStaff();
        }
        // スタッフ位置を同期（TMXから読み込んだ位置に設定）
        useEntityStore.getState().syncStaffPositions();

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
      // デバッグリスナーを解除
      if (debugUnsubscribeRef.current) {
        debugUnsubscribeRef.current();
        debugUnsubscribeRef.current = null;
      }
      // テーブル解放リスナーを解除
      if (tableUnsubscribeRef.current) {
        tableUnsubscribeRef.current();
        tableUnsubscribeRef.current = null;
      }
      tableContainersRef.current = null;
      // スプライトマップをクリア
      customerSpritesRef.current.clear();
      staffSpritesRef.current.clear();
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
    <>
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
      {/* ポストエフェクトデバッグパネル */}
      <PostEffectDebugPanel
        state={postEffects.state}
        toggleFilter={postEffects.toggleFilter}
        updateParam={postEffects.updateParam}
        resetAll={postEffects.resetAll}
        disableAll={postEffects.disableAll}
      />
    </>
  );
}
