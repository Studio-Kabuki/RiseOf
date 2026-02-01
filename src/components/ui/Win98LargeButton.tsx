import { useButtonPress, buttonBaseStyle } from '../../hooks';

export interface Win98LargeButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  variant?: 'raised' | 'inset';
}

/**
 * Windows 98 スタイルの大きなボタン（オーバーレイの「開店する」「次の日へ」用）
 */
export function Win98LargeButton({
  children,
  onClick,
  color = '#008542',
  variant = 'raised',
}: Win98LargeButtonProps) {
  const { isPressed, pressHandlers } = useButtonPress();

  // 押下状態とvariantに応じてボーダーを決定
  const isInset = variant === 'inset' ? !isPressed : isPressed;

  const borderStyle = isInset
    ? {
        borderTop: '3px solid #808080',
        borderLeft: '3px solid #808080',
        borderBottom: '3px solid #FFFFFF',
        borderRight: '3px solid #FFFFFF',
      }
    : {
        borderTop: '3px solid #FFFFFF',
        borderLeft: '3px solid #FFFFFF',
        borderBottom: '3px solid #808080',
        borderRight: '3px solid #808080',
      };

  return (
    <button
      onClick={onClick}
      {...pressHandlers}
      style={{
        ...buttonBaseStyle,
        backgroundColor: '#C0C0C0',
        border: 'none',
        ...borderStyle,
        padding: '16px 48px',
        cursor: 'pointer',
        fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
        outline: 'none',
      }}
    >
      <span style={{ fontSize: '24px', fontWeight: 'bold', color }}>
        {children}
      </span>
    </button>
  );
}
