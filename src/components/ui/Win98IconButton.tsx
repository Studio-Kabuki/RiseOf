import { useButtonPress, getWin98BorderStyle, buttonBaseStyle } from '../../hooks';

export interface Win98IconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: number;
}

/**
 * Windows 98 スタイルのアイコンボタン（タイトルバーの×や?用）
 */
export function Win98IconButton({
  children,
  onClick,
  disabled = false,
  size = 24,
}: Win98IconButtonProps) {
  const { isPressed, pressHandlers } = useButtonPress(disabled);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...pressHandlers}
      style={{
        ...buttonBaseStyle,
        width: `${size}px`,
        height: `${size - 3}px`,
        backgroundColor: '#C0C0C0',
        ...getWin98BorderStyle(isPressed, disabled),
        color: disabled ? '#808080' : '#000000',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        lineHeight: 1,
        outline: 'none',
      }}
    >
      {children}
    </button>
  );
}
