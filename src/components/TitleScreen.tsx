import { useState, useEffect } from 'react';
import { loadMenusFromCSV } from '../data/menuLoader';
import { loadStaffsFromCSV } from '../data/staffLoader';
import titleImage from '../../.docs/title.png';

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadMenusFromCSV(), loadStaffsFromCSV()]);
        setIsLoading(false);
      } catch (error) {
        setLoadError('データの読み込みに失敗しました');
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5DC',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* タイトル画像（縦合わせ） */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src={titleImage}
          alt="アメリカンダイナーシミュレーター"
          style={{
            height: '100%',
            width: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* ローディング / スタートボタン */}
      {isLoading ? (
        <div
          style={{
            color: '#ffffff',
            fontSize: '18px',
          }}
        >
          読み込み中...
        </div>
      ) : loadError ? (
        <div
          style={{
            color: '#ff6b6b',
            fontSize: '16px',
          }}
        >
          {loadError}
        </div>
      ) : (
        <button
          onClick={onStart}
          style={{
            position: 'absolute',
            bottom: '24px',
            zIndex: 1,
            padding: '6px 18px',
            backgroundColor: '#C0C0C0',
            borderTop: '3px solid #FFFFFF',
            borderLeft: '3px solid #FFFFFF',
            borderBottom: '3px solid #808080',
            borderRight: '3px solid #808080',
            cursor: 'pointer',
            fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
            outline: 'none',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.borderTop = '3px solid #808080';
            e.currentTarget.style.borderLeft = '3px solid #808080';
            e.currentTarget.style.borderBottom = '3px solid #FFFFFF';
            e.currentTarget.style.borderRight = '3px solid #FFFFFF';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.borderTop = '3px solid #FFFFFF';
            e.currentTarget.style.borderLeft = '3px solid #FFFFFF';
            e.currentTarget.style.borderBottom = '3px solid #808080';
            e.currentTarget.style.borderRight = '3px solid #808080';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderTop = '3px solid #FFFFFF';
            e.currentTarget.style.borderLeft = '3px solid #FFFFFF';
            e.currentTarget.style.borderBottom = '3px solid #808080';
            e.currentTarget.style.borderRight = '3px solid #808080';
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000' }}>
            OPEN
          </span>
        </button>
      )}
    </div>
  );
}
