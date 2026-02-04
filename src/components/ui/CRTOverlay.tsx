/**
 * CRTモニター風オーバーレイ
 * スキャンライン + ビネット効果でレトロゲーセン感を演出
 */
export function CRTOverlay() {
  return (
    <>
      {/* スキャンライン（ムラあり：縦方向にグラデーションで濃淡） */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 1px,
              rgba(0, 0, 0, 0.12) 1px,
              rgba(0, 0, 0, 0.12) 2px
            ),
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0.08) 0%,
              rgba(0, 0, 0, 0.02) 20%,
              rgba(0, 0, 0, 0.06) 40%,
              rgba(0, 0, 0, 0.01) 60%,
              rgba(0, 0, 0, 0.07) 80%,
              rgba(0, 0, 0, 0.03) 100%
            )
          `,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
      {/* ビネット（画面端を暗くする）- 強め */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          boxShadow: 'inset 0 0 80px 20px rgba(0, 0, 0, 0.4)',
          pointerEvents: 'none',
          zIndex: 9998,
        }}
      />
      {/* 微妙な画面の湾曲感（角丸でCRTっぽく） */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: '4px solid #111',
          borderRadius: '12px',
          pointerEvents: 'none',
          zIndex: 9997,
        }}
      />
    </>
  );
}
