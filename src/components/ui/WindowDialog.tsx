import type { ReactNode } from 'react';
import { Win98IconButton } from './Win98IconButton';

export interface WindowDialogProps {
  title: string;
  width?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  closeDisabled?: boolean;
  zIndex?: number;
  variant?: 'default' | 'error';
  contentPadding?: string;
}

export function WindowDialog({
  title,
  width = '400px',
  children,
  footer,
  onClose,
  closeDisabled = false,
  zIndex = 1000,
  variant = 'default',
  contentPadding = '16px',
}: WindowDialogProps) {
  const isError = variant === 'error';

  // Windows 98 スタイルのタイトルバー色（アメリカンダイナー風レッドグラデーション）
  const titleBarColor = isError ? '#800000' : 'linear-gradient(90deg, #8B0000 0%, #CC0000 20%, #FF4500 40%, #FF6600 60%, #FFA500 80%, #FFD700 100%)';

  const handleCloseClick = () => {
    if (!closeDisabled && onClose) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex,
        pointerEvents: 'none', // バックドロップはポインターイベントを通過
      }}
    >
      {/* ウィンドウ本体 */}
      <div
        style={{
          width,
          backgroundColor: '#C0C0C0',
          // Windows 98 風の3Dボーダー（外側）
          borderTop: '2px solid #FFFFFF',
          borderLeft: '2px solid #FFFFFF',
          borderBottom: '2px solid #404040',
          borderRight: '2px solid #404040',
          boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.4)',
          fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
          pointerEvents: 'auto', // ダイアログ本体はポインターイベントを受け取る
        }}
      >
        {/* 内側のボーダー */}
        <div
          style={{
            borderTop: '1px solid #DFDFDF',
            borderLeft: '1px solid #DFDFDF',
            borderBottom: '1px solid #808080',
            borderRight: '1px solid #808080',
          }}
        >
          {/* タイトルバー */}
          <div
            style={{
              background: titleBarColor,
              padding: '3px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '2px',
            }}
          >
            <span
              style={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px',
                marginLeft: '2px',
              }}
            >
              {title}
            </span>

            {/* 閉じるボタン */}
            {onClose && (
              <Win98IconButton
                onClick={handleCloseClick}
                disabled={closeDisabled}
                size={24}
              >
                ✕
              </Win98IconButton>
            )}
          </div>

          {/* コンテンツ */}
          <div style={{ padding: contentPadding }}>{children}</div>

          {/* フッター */}
          {footer && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderTop: '1px solid #808080',
                backgroundColor: '#C0C0C0',
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
