import { useState, useEffect } from 'react';
import { loadMenusFromCSV } from '../data/menuLoader';

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadMenusFromCSV();
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
        background: 'linear-gradient(180deg, #1a472a 0%, #2d5a3d 50%, #1a472a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 装飾ライン */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #c9a227, transparent)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #c9a227, transparent)',
        }}
      />

      {/* タイトル */}
      <h1
        style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#ffffff',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          marginBottom: '8px',
          fontFamily: 'Georgia, serif',
        }}
      >
        🍝 サイゼリヤ
      </h1>
      <h2
        style={{
          fontSize: '32px',
          color: '#c9a227',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          marginBottom: '48px',
          fontFamily: 'Georgia, serif',
          letterSpacing: '8px',
        }}
      >
        SIMULATOR
      </h2>

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
            padding: '16px 48px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1a472a',
            backgroundColor: '#c9a227',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }}
        >
          ゲームスタート
        </button>
      )}

      {/* フッターテキスト */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '12px',
        }}
      >
        メニューを選んでお店を経営しよう
      </div>
    </div>
  );
}
