import { useState, useCallback, useRef, useEffect } from 'react';
import type { Application, Filter } from 'pixi.js';
import {
  CRTFilter,
  GlowFilter,
  PixelateFilter,
  OldFilmFilter,
  AdjustmentFilter,
  AdvancedBloomFilter,
  GodrayFilter,
  DotFilter,
  CrossHatchFilter,
  ColorOverlayFilter,
} from 'pixi-filters';

// フィルターの設定型
export interface FilterConfig {
  enabled: boolean;
  params: Record<string, number | boolean>;
}

export interface PostEffectsState {
  crt: FilterConfig;
  glow: FilterConfig;
  pixelate: FilterConfig;
  oldFilm: FilterConfig;
  adjustment: FilterConfig;
  bloom: FilterConfig;
  godray: FilterConfig;
  dot: FilterConfig;
  crossHatch: FilterConfig;
  colorOverlay: FilterConfig;
}

// デフォルト設定
const defaultState: PostEffectsState = {
  crt: {
    enabled: false,
    params: {
      lineWidth: 1,
      lineContrast: 0.25,
      noise: 0.1,
      noiseSize: 1,
      curvature: 1,
      verticalLine: false,
    },
  },
  glow: {
    enabled: false,
    params: {
      distance: 10,
      outerStrength: 2,
      innerStrength: 0,
      color: 0xffffff,
      quality: 0.5,
    },
  },
  pixelate: {
    enabled: false,
    params: {
      sizeX: 4,
      sizeY: 4,
    },
  },
  oldFilm: {
    enabled: false,
    params: {
      sepia: 0.3,
      noise: 0.3,
      noiseSize: 1,
      scratch: 0.5,
      scratchDensity: 0.3,
      scratchWidth: 1,
      vignetting: 0.3,
      vignettingAlpha: 1,
      vignettingBlur: 0.3,
    },
  },
  adjustment: {
    enabled: false,
    params: {
      gamma: 1,
      saturation: 1,
      contrast: 1,
      brightness: 1,
      red: 1,
      green: 1,
      blue: 1,
      alpha: 1,
    },
  },
  bloom: {
    enabled: false,
    params: {
      threshold: 0.5,
      bloomScale: 1,
      brightness: 1,
      blur: 4,
      quality: 4,
    },
  },
  godray: {
    enabled: false,
    params: {
      angle: 30,
      gain: 0.5,
      lacunarity: 2.5,
      parallel: true,
      time: 0,
    },
  },
  dot: {
    enabled: false,
    params: {
      scale: 1,
      angle: 5,
    },
  },
  crossHatch: {
    enabled: false,
    params: {},
  },
  colorOverlay: {
    enabled: false,
    params: {
      color: 0xff0000,
      alpha: 0.3,
    },
  },
};

// パラメータの範囲定義
export const parameterRanges: Record<string, Record<string, { min: number; max: number; step: number }>> = {
  crt: {
    lineWidth: { min: 0, max: 5, step: 0.1 },
    lineContrast: { min: 0, max: 1, step: 0.05 },
    noise: { min: 0, max: 1, step: 0.05 },
    noiseSize: { min: 0.5, max: 4, step: 0.1 },
    curvature: { min: 0, max: 10, step: 0.5 },
  },
  glow: {
    distance: { min: 1, max: 50, step: 1 },
    outerStrength: { min: 0, max: 10, step: 0.5 },
    innerStrength: { min: 0, max: 10, step: 0.5 },
    quality: { min: 0.1, max: 1, step: 0.1 },
  },
  pixelate: {
    sizeX: { min: 1, max: 20, step: 1 },
    sizeY: { min: 1, max: 20, step: 1 },
  },
  oldFilm: {
    sepia: { min: 0, max: 1, step: 0.1 },
    noise: { min: 0, max: 1, step: 0.1 },
    noiseSize: { min: 0.5, max: 4, step: 0.1 },
    scratch: { min: 0, max: 1, step: 0.1 },
    scratchDensity: { min: 0, max: 1, step: 0.1 },
    scratchWidth: { min: 0.5, max: 3, step: 0.1 },
    vignetting: { min: 0, max: 1, step: 0.1 },
    vignettingAlpha: { min: 0, max: 1, step: 0.1 },
    vignettingBlur: { min: 0, max: 1, step: 0.1 },
  },
  adjustment: {
    gamma: { min: 0.1, max: 3, step: 0.1 },
    saturation: { min: 0, max: 3, step: 0.1 },
    contrast: { min: 0, max: 3, step: 0.1 },
    brightness: { min: 0, max: 3, step: 0.1 },
    red: { min: 0, max: 2, step: 0.1 },
    green: { min: 0, max: 2, step: 0.1 },
    blue: { min: 0, max: 2, step: 0.1 },
    alpha: { min: 0, max: 1, step: 0.1 },
  },
  bloom: {
    threshold: { min: 0, max: 1, step: 0.1 },
    bloomScale: { min: 0, max: 3, step: 0.1 },
    brightness: { min: 0, max: 3, step: 0.1 },
    blur: { min: 0, max: 20, step: 1 },
    quality: { min: 1, max: 10, step: 1 },
  },
  godray: {
    angle: { min: 0, max: 360, step: 5 },
    gain: { min: 0, max: 1, step: 0.05 },
    lacunarity: { min: 0, max: 5, step: 0.1 },
    time: { min: 0, max: 10, step: 0.1 },
  },
  dot: {
    scale: { min: 0.3, max: 3, step: 0.1 },
    angle: { min: 0, max: 90, step: 1 },
  },
  colorOverlay: {
    alpha: { min: 0, max: 1, step: 0.05 },
  },
};

// フィルター名の日本語表示
export const filterLabels: Record<keyof PostEffectsState, string> = {
  crt: 'CRT',
  glow: 'Glow',
  pixelate: 'Pixelate',
  oldFilm: 'Old Film',
  adjustment: 'Adjustment',
  bloom: 'Bloom',
  godray: 'Godray',
  dot: 'Dot',
  crossHatch: 'CrossHatch',
  colorOverlay: 'Color Overlay',
};

export function usePostEffects(app: Application | null) {
  const [state, setState] = useState<PostEffectsState>(defaultState);
  const filtersRef = useRef<Map<string, Filter>>(new Map());
  const animationRef = useRef<number | null>(null);

  // フィルターを作成・更新
  const updateFilters = useCallback(() => {
    if (!app?.stage) return;

    const filters: Filter[] = [];
    const filterMap = filtersRef.current;

    // CRT
    if (state.crt.enabled) {
      let filter = filterMap.get('crt') as CRTFilter;
      if (!filter) {
        filter = new CRTFilter();
        filterMap.set('crt', filter);
      }
      filter.lineWidth = state.crt.params.lineWidth as number;
      filter.lineContrast = state.crt.params.lineContrast as number;
      filter.noise = state.crt.params.noise as number;
      filter.noiseSize = state.crt.params.noiseSize as number;
      filter.curvature = state.crt.params.curvature as number;
      filter.verticalLine = state.crt.params.verticalLine as boolean;
      filters.push(filter);
    }

    // Glow
    if (state.glow.enabled) {
      let filter = filterMap.get('glow') as GlowFilter;
      if (!filter) {
        filter = new GlowFilter();
        filterMap.set('glow', filter);
      }
      filter.distance = state.glow.params.distance as number;
      filter.outerStrength = state.glow.params.outerStrength as number;
      filter.innerStrength = state.glow.params.innerStrength as number;
      filter.color = state.glow.params.color as number;
      filter.quality = state.glow.params.quality as number;
      filters.push(filter);
    }

    // Pixelate
    if (state.pixelate.enabled) {
      let filter = filterMap.get('pixelate') as PixelateFilter;
      if (!filter) {
        filter = new PixelateFilter();
        filterMap.set('pixelate', filter);
      }
      filter.sizeX = state.pixelate.params.sizeX as number;
      filter.sizeY = state.pixelate.params.sizeY as number;
      filters.push(filter);
    }

    // Old Film
    if (state.oldFilm.enabled) {
      let filter = filterMap.get('oldFilm') as OldFilmFilter;
      if (!filter) {
        filter = new OldFilmFilter();
        filterMap.set('oldFilm', filter);
      }
      filter.sepia = state.oldFilm.params.sepia as number;
      filter.noise = state.oldFilm.params.noise as number;
      filter.noiseSize = state.oldFilm.params.noiseSize as number;
      filter.scratch = state.oldFilm.params.scratch as number;
      filter.scratchDensity = state.oldFilm.params.scratchDensity as number;
      filter.scratchWidth = state.oldFilm.params.scratchWidth as number;
      filter.vignetting = state.oldFilm.params.vignetting as number;
      filter.vignettingAlpha = state.oldFilm.params.vignettingAlpha as number;
      filter.vignettingBlur = state.oldFilm.params.vignettingBlur as number;
      filters.push(filter);
    }

    // Adjustment
    if (state.adjustment.enabled) {
      let filter = filterMap.get('adjustment') as AdjustmentFilter;
      if (!filter) {
        filter = new AdjustmentFilter();
        filterMap.set('adjustment', filter);
      }
      filter.gamma = state.adjustment.params.gamma as number;
      filter.saturation = state.adjustment.params.saturation as number;
      filter.contrast = state.adjustment.params.contrast as number;
      filter.brightness = state.adjustment.params.brightness as number;
      filter.red = state.adjustment.params.red as number;
      filter.green = state.adjustment.params.green as number;
      filter.blue = state.adjustment.params.blue as number;
      filter.alpha = state.adjustment.params.alpha as number;
      filters.push(filter);
    }

    // Bloom
    if (state.bloom.enabled) {
      let filter = filterMap.get('bloom') as AdvancedBloomFilter;
      if (!filter) {
        filter = new AdvancedBloomFilter();
        filterMap.set('bloom', filter);
      }
      filter.threshold = state.bloom.params.threshold as number;
      filter.bloomScale = state.bloom.params.bloomScale as number;
      filter.brightness = state.bloom.params.brightness as number;
      filter.blur = state.bloom.params.blur as number;
      filter.quality = state.bloom.params.quality as number;
      filters.push(filter);
    }

    // Godray
    if (state.godray.enabled) {
      let filter = filterMap.get('godray') as GodrayFilter;
      if (!filter) {
        filter = new GodrayFilter();
        filterMap.set('godray', filter);
      }
      filter.angle = state.godray.params.angle as number;
      filter.gain = state.godray.params.gain as number;
      filter.lacunarity = state.godray.params.lacunarity as number;
      filter.parallel = state.godray.params.parallel as boolean;
      filter.time = state.godray.params.time as number;
      filters.push(filter);
    }

    // Dot
    if (state.dot.enabled) {
      let filter = filterMap.get('dot') as DotFilter;
      if (!filter) {
        filter = new DotFilter();
        filterMap.set('dot', filter);
      }
      filter.scale = state.dot.params.scale as number;
      filter.angle = state.dot.params.angle as number;
      filters.push(filter);
    }

    // CrossHatch
    if (state.crossHatch.enabled) {
      let filter = filterMap.get('crossHatch') as CrossHatchFilter;
      if (!filter) {
        filter = new CrossHatchFilter();
        filterMap.set('crossHatch', filter);
      }
      filters.push(filter);
    }

    // Color Overlay
    if (state.colorOverlay.enabled) {
      let filter = filterMap.get('colorOverlay') as ColorOverlayFilter;
      if (!filter) {
        filter = new ColorOverlayFilter();
        filterMap.set('colorOverlay', filter);
      }
      filter.color = state.colorOverlay.params.color as number;
      filter.alpha = state.colorOverlay.params.alpha as number;
      filters.push(filter);
    }

    app.stage.filters = filters.length > 0 ? filters : null;
  }, [app, state]);

  // フィルター更新を適用
  useEffect(() => {
    updateFilters();
  }, [updateFilters]);

  // Godray / OldFilmのアニメーション（有効時に time を自動更新）
  useEffect(() => {
    if (state.godray.enabled || state.oldFilm.enabled) {
      let lastTime = performance.now();
      const animate = () => {
        const now = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        // Godray の time を更新
        const godrayFilter = filtersRef.current.get('godray') as GodrayFilter | undefined;
        if (godrayFilter && state.godray.enabled) {
          godrayFilter.time += delta * 0.5;
        }

        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [state.godray.enabled, state.oldFilm.enabled]);

  // フィルターのON/OFF切り替え
  const toggleFilter = useCallback((filterName: keyof PostEffectsState) => {
    setState((prev) => ({
      ...prev,
      [filterName]: {
        ...prev[filterName],
        enabled: !prev[filterName].enabled,
      },
    }));
  }, []);

  // パラメータ更新
  const updateParam = useCallback(
    (filterName: keyof PostEffectsState, paramName: string, value: number | boolean) => {
      setState((prev) => ({
        ...prev,
        [filterName]: {
          ...prev[filterName],
          params: {
            ...prev[filterName].params,
            [paramName]: value,
          },
        },
      }));
    },
    []
  );

  // すべてリセット
  const resetAll = useCallback(() => {
    setState(defaultState);
  }, []);

  // すべてOFF
  const disableAll = useCallback(() => {
    setState((prev) => {
      const newState = { ...prev };
      for (const key of Object.keys(newState) as (keyof PostEffectsState)[]) {
        newState[key] = { ...newState[key], enabled: false };
      }
      return newState;
    });
  }, []);

  return {
    state,
    toggleFilter,
    updateParam,
    resetAll,
    disableAll,
  };
}
