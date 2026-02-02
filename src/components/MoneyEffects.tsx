import { useRestaurantStore } from '../store';
import { useEffect, useState } from 'react';

interface EffectState {
  id: string;
  amount: number;
  x: number;
  y: number;
  opacity: number;
  offsetY: number;
}

export function MoneyEffects() {
  const { moneyEffects } = useRestaurantStore();
  const [animatedEffects, setAnimatedEffects] = useState<EffectState[]>([]);

  useEffect(() => {
    // 新しいエフェクトを追加
    const newEffects = moneyEffects.filter(
      (e) => !animatedEffects.some((a) => a.id === e.id)
    );

    if (newEffects.length > 0) {
      setAnimatedEffects((prev) => [
        ...prev,
        ...newEffects.map((e) => ({
          id: e.id,
          amount: e.amount,
          x: e.x,
          y: e.y,
          opacity: 1,
          offsetY: 0,
        })),
      ]);
    }

    // 存在しなくなったエフェクトを削除
    setAnimatedEffects((prev) =>
      prev.filter((a) => moneyEffects.some((e) => e.id === a.id))
    );
  }, [moneyEffects]);

  // アニメーション更新
  useEffect(() => {
    if (animatedEffects.length === 0) return;

    const interval = setInterval(() => {
      setAnimatedEffects((prev) =>
        prev.map((e) => ({
          ...e,
          offsetY: e.offsetY - 2,
          opacity: Math.max(0, e.opacity - 0.03),
        }))
      );
    }, 30);

    return () => clearInterval(interval);
  }, [animatedEffects.length > 0]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {animatedEffects.map((effect) => (
        <div
          key={effect.id}
          style={{
            position: 'absolute',
            left: effect.x,
            top: effect.y + effect.offsetY,
            transform: 'translate(-50%, -100%)',
            opacity: effect.opacity,
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#FFD700',
            textShadow: '1px 1px 2px #000, -1px -1px 2px #000',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '14px' }}>💰</span>
          <span>+{effect.amount}円</span>
        </div>
      ))}
    </div>
  );
}
