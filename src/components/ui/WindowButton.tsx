import { useState } from 'react';
import type { ReactNode } from 'react';

export interface WindowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function WindowButton({
  children,
  onClick,
  disabled = false,
  size = 'medium',
}: WindowButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  // サイズに応じたパディング
  const padding = {
    small: '2px 8px',
    medium: '4px 16px',
    large: '6px 24px',
  }[size];

  const fontSize = {
    small: '11px',
    medium: '12px',
    large: '13px',
  }[size];

  // Windows 98 スタイルの3Dボーダー
  const getBorderStyle = () => {
    if (disabled) {
      return {
        borderTop: '2px solid #DFDFDF',
        borderLeft: '2px solid #DFDFDF',
        borderBottom: '2px solid #808080',
        borderRight: '2px solid #808080',
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
  };

  const height = {
    small: '22px',
    medium: '26px',
    large: '30px',
  }[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        padding,
        fontSize,
        fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: '#C0C0C0',
        color: disabled ? '#808080' : '#000000',
        ...getBorderStyle(),
        outline: 'none',
        minWidth: size === 'large' ? '80px' : size === 'medium' ? '70px' : '60px',
        height,
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </button>
  );
}
