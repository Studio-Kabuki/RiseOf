import type { ReactNode } from 'react';
import { useButtonPress, getWin98BorderStyle, buttonBaseStyle } from '../../hooks';

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
  const { isPressed, pressHandlers } = useButtonPress(disabled);

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

  const height = {
    small: '22px',
    medium: '26px',
    large: '30px',
  }[size];

  const borderStyle = disabled
    ? {
        borderTop: '2px solid #DFDFDF',
        borderLeft: '2px solid #DFDFDF',
        borderBottom: '2px solid #808080',
        borderRight: '2px solid #808080',
      }
    : getWin98BorderStyle(isPressed);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...pressHandlers}
      style={{
        ...buttonBaseStyle,
        padding,
        fontSize,
        fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: '#C0C0C0',
        color: disabled ? '#808080' : '#000000',
        ...borderStyle,
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
