import { useState, useCallback } from 'react';

/**
 * ボタンの押下状態を管理するフック
 * マウスとタッチの両方に対応
 */
export function useButtonPress(disabled = false) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePressStart = useCallback(() => {
    if (!disabled) setIsPressed(true);
  }, [disabled]);

  const handlePressEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  // イベントハンドラーをまとめて返す
  const pressHandlers = {
    // マウスイベント
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onMouseLeave: handlePressEnd,
    // タッチイベント（スマホ対応）
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
    onTouchCancel: handlePressEnd,
  };

  return { isPressed, pressHandlers };
}

/**
 * Windows 98 スタイルの3Dボーダーを取得
 */
export function getWin98BorderStyle(isPressed: boolean, disabled = false) {
  if (disabled) {
    return {
      borderTop: '2px solid #808080',
      borderLeft: '2px solid #808080',
      borderBottom: '2px solid #FFFFFF',
      borderRight: '2px solid #FFFFFF',
    };
  }
  if (isPressed) {
    // 押された時は凹んだ見た目
    return {
      borderTop: '2px solid #808080',
      borderLeft: '2px solid #808080',
      borderBottom: '2px solid #FFFFFF',
      borderRight: '2px solid #FFFFFF',
    };
  }
  // 通常は浮き出た見た目
  return {
    borderTop: '2px solid #FFFFFF',
    borderLeft: '2px solid #FFFFFF',
    borderBottom: '2px solid #808080',
    borderRight: '2px solid #808080',
  };
}

/**
 * 共通のボタンスタイル（タッチハイライト無効化など）
 */
export const buttonBaseStyle: React.CSSProperties = {
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
  userSelect: 'none',
};
