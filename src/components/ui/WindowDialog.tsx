import type { ReactNode } from 'react';

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
  contentPadding = '20px',
}: WindowDialogProps) {
  const isError = variant === 'error';

  const headerGradient = isError
    ? 'linear-gradient(180deg, #CC0000 0%, #990000 10%, #990000 90%, #660000 100%)'
    : 'linear-gradient(180deg, #0A246A 0%, #0054E3 10%, #0054E3 90%, #0A246A 100%)';

  const borderColor = isError ? '#CC0000' : '#0054E3';

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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex,
      }}
    >
      <div
        style={{
          width,
          backgroundColor: '#ECE9D8',
          border: `2px solid ${borderColor}`,
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          fontFamily: 'Tahoma, "MS UI Gothic", sans-serif',
        }}
      >
        {/* タイトルバー */}
        <div
          style={{
            background: headerGradient,
            padding: '6px 10px',
            borderRadius: '6px 6px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: '13px',
            }}
          >
            {title}
          </span>

          {/* 閉じるボタン */}
          {onClose && (
            <button
              onClick={handleCloseClick}
              disabled={closeDisabled}
              style={{
                width: '21px',
                height: '21px',
                background: closeDisabled
                  ? 'linear-gradient(180deg, #999 0%, #777 50%, #666 100%)'
                  : 'linear-gradient(180deg, #F5A68E 0%, #C25046 50%, #9E2F25 100%)',
                border: '1px solid #fff',
                borderRadius: '3px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: closeDisabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: closeDisabled ? 0.6 : 1,
              }}
            >
              ✕
            </button>
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
              padding: '12px',
              backgroundColor: '#f0f0f0',
              borderTop: '1px solid #ccc',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
