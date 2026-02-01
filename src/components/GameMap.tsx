import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text, TextStyle, Sprite, Assets } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useGameStore } from '../store';
import { getShopPositions } from '../data';
import './GameMap.css';

const TILE_SIZE = 100;
const MAP_COLS = 10;
const MAP_ROWS = 8;
const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

// アイコンURL
const ICONS = {
  locked: 'https://img.icons8.com/color/96/lock--v1.png',
  vacant: 'https://img.icons8.com/color/96/real-estate.png',
  owned: 'https://img.icons8.com/color/96/shop.png',
};

// 背景タイルをランダム生成
const generateBackgroundTiles = (shopPositions: Record<string, { col: number; row: number }>): string[][] => {
  const types = ['grass', 'grass', 'grass', 'road', 'park', 'building'];
  const tiles: string[][] = [];

  for (let row = 0; row < MAP_ROWS; row++) {
    tiles[row] = [];
    for (let col = 0; col < MAP_COLS; col++) {
      const isShopPos = Object.values(shopPositions).some(
        pos => pos.col === col && pos.row === row
      );
      if (isShopPos) {
        tiles[row][col] = 'road';
      } else {
        tiles[row][col] = types[Math.floor(Math.random() * types.length)];
      }
    }
  }
  return tiles;
};

const TILE_COLORS: Record<string, number> = {
  grass: 0x4a7c23,
  road: 0x5a5a5a,
  park: 0x2d8a27,
  building: 0x6b6b6b,
};

const SHOP_COLORS: Record<string, number> = {
  locked: 0x555555,
  vacant: 0x8b6914,
  owned: 0xc41e3a,
};

export const GameMap = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const backgroundTilesRef = useRef<string[][] | null>(null);
  const iconsLoadedRef = useRef(false);

  const { shops, selectedShopId } = useGameStore();

  // 初期化
  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    const initApp = async () => {
      const app = new Application();
      await app.init({
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        background: 0x1a1a2e,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      containerRef.current!.appendChild(app.canvas);
      appRef.current = app;

      // アイコンをプリロード
      if (!iconsLoadedRef.current) {
        await Assets.load([ICONS.locked, ICONS.vacant, ICONS.owned]);
        iconsLoadedRef.current = true;
      }

      // Viewport作成
      const viewport = new Viewport({
        screenWidth: app.screen.width,
        screenHeight: app.screen.height,
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,
        events: app.renderer.events,
      });

      viewport
        .drag()
        .pinch()
        .wheel()
        .decelerate()
        .clamp({ direction: 'all' })
        .clampZoom({ minScale: 0.5, maxScale: 2 });

      viewport.moveCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);

      app.stage.addChild(viewport);
      viewportRef.current = viewport;

      // CSVから店舗位置を取得して背景タイルを生成
      const shopPositions = getShopPositions();
      if (!backgroundTilesRef.current) {
        backgroundTilesRef.current = generateBackgroundTiles(shopPositions);
      }

      drawMap();
    };

    initApp();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
        viewportRef.current = null;
      }
    };
  }, []);

  // マップ再描画
  const drawMap = async () => {
    const viewport = viewportRef.current;
    if (!viewport || !backgroundTilesRef.current) return;

    viewport.removeChildren();

    const mapContainer = new Container();

    // 背景タイル描画
    backgroundTilesRef.current.forEach((row, rowIndex) => {
      row.forEach((tileType, colIndex) => {
        const g = new Graphics();
        g.rect(0, 0, TILE_SIZE - 2, TILE_SIZE - 2);
        g.fill({ color: TILE_COLORS[tileType] || 0x333333 });
        g.stroke({ color: 0x222222, width: 1 });
        g.x = colIndex * TILE_SIZE;
        g.y = rowIndex * TILE_SIZE;
        mapContainer.addChild(g);
      });
    });

    viewport.addChild(mapContainer);

    // CSVから店舗位置を取得
    const shopPositions = getShopPositions();

    // 店舗描画
    const currentShops = useGameStore.getState().shops;
    const currentSelectedId = useGameStore.getState().selectedShopId;

    for (const shop of currentShops) {
      const pos = shopPositions[shop.id];
      if (!pos) continue;

      const shopContainer = new Container();
      shopContainer.x = pos.col * TILE_SIZE;
      shopContainer.y = pos.row * TILE_SIZE;
      shopContainer.eventMode = 'static';
      shopContainer.cursor = shop.status === 'locked' ? 'not-allowed' : 'pointer';

      shopContainer.on('pointerdown', (e) => {
        e.stopPropagation();
        const currentShop = useGameStore.getState().shops.find(s => s.id === shop.id);
        if (!currentShop || currentShop.status === 'locked') return;

        if (currentShop.status === 'vacant') {
          useGameStore.getState().buyShop(shop.id);
        } else {
          const sel = useGameStore.getState().selectedShopId;
          useGameStore.getState().selectShop(sel === shop.id ? null : shop.id);
        }
      });

      // 店舗の建物
      const bg = new Graphics();
      bg.roundRect(8, 8, TILE_SIZE - 18, TILE_SIZE - 18, 8);
      bg.fill({ color: SHOP_COLORS[shop.status] || 0x333333 });

      if (currentSelectedId === shop.id) {
        bg.stroke({ color: 0xffd700, width: 4 });
      } else {
        bg.stroke({ color: 0x111111, width: 2 });
      }

      shopContainer.addChild(bg);

      // アイコン
      const iconUrl = ICONS[shop.status];
      try {
        const texture = await Assets.load(iconUrl);
        const sprite = new Sprite(texture);
        sprite.width = 40;
        sprite.height = 40;
        sprite.anchor.set(0.5);
        sprite.x = TILE_SIZE / 2;
        sprite.y = 42;
        shopContainer.addChild(sprite);
      } catch (e) {
        // フォールバック
      }

      // 店名
      const nameText = new Text({
        text: shop.name,
        style: new TextStyle({
          fontSize: 11,
          fill: 0xffffff,
          fontWeight: 'bold',
        }),
      });
      nameText.anchor.set(0.5);
      nameText.x = TILE_SIZE / 2;
      nameText.y = TILE_SIZE - 18;
      shopContainer.addChild(nameText);

      // コスト表示（vacant時）
      if (shop.status === 'vacant') {
        const costText = new Text({
          text: `💰${shop.unlockCost}`,
          style: new TextStyle({
            fontSize: 10,
            fill: 0xffd700,
          }),
        });
        costText.anchor.set(0.5);
        costText.x = TILE_SIZE / 2;
        costText.y = 70;
        shopContainer.addChild(costText);
      }

      viewport.addChild(shopContainer);
    }
  };

  // 状態変更時に再描画
  useEffect(() => {
    drawMap();
  }, [shops, selectedShopId]);

  // リサイズ対応
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !appRef.current || !viewportRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      appRef.current.renderer.resize(width, height);
      viewportRef.current.resize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={containerRef} className="game-map-viewport" />;
};
