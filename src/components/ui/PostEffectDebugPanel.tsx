import { useState } from 'react';
import type { PostEffectsState } from '../../hooks/usePostEffects';
import { parameterRanges, filterLabels } from '../../hooks/usePostEffects';

interface PostEffectDebugPanelProps {
  state: PostEffectsState;
  toggleFilter: (filterName: keyof PostEffectsState) => void;
  updateParam: (filterName: keyof PostEffectsState, paramName: string, value: number | boolean) => void;
  resetAll: () => void;
  disableAll: () => void;
}

// 色入力用のヘルパー
function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function numberToHex(num: number): string {
  return '#' + num.toString(16).padStart(6, '0');
}

export function PostEffectDebugPanel({
  state,
  toggleFilter,
  updateParam,
  resetAll,
  disableAll,
}: PostEffectDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());

  const toggleExpanded = (filterName: string) => {
    setExpandedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterName)) {
        next.delete(filterName);
      } else {
        next.add(filterName);
      }
      return next;
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          padding: '8px 16px',
          backgroundColor: '#C0C0C0',
          border: 'none',
          borderTop: '2px solid #FFFFFF',
          borderLeft: '2px solid #FFFFFF',
          borderBottom: '2px solid #404040',
          borderRight: '2px solid #404040',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 10000,
        }}
      >
        Post Effects
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        width: 320,
        maxHeight: 'calc(100vh - 100px)',
        backgroundColor: '#C0C0C0',
        borderTop: '2px solid #FFFFFF',
        borderLeft: '2px solid #FFFFFF',
        borderBottom: '2px solid #404040',
        borderRight: '2px solid #404040',
        boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.4)',
        fontFamily: 'inherit',
        fontSize: '11px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* タイトルバー */}
      <div
        style={{
          background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
          padding: '3px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>
          Post Effects Debug
        </span>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            width: 20,
            height: 20,
            backgroundColor: '#C0C0C0',
            border: 'none',
            borderTop: '2px solid #FFFFFF',
            borderLeft: '2px solid #FFFFFF',
            borderBottom: '2px solid #404040',
            borderRight: '2px solid #404040',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            lineHeight: '14px',
          }}
        >
          ✕
        </button>
      </div>

      {/* ツールバー */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '4px 6px',
          borderBottom: '1px solid #808080',
          flexShrink: 0,
        }}
      >
        <button
          onClick={disableAll}
          style={{
            flex: 1,
            padding: '4px 8px',
            backgroundColor: '#C0C0C0',
            border: 'none',
            borderTop: '2px solid #FFFFFF',
            borderLeft: '2px solid #FFFFFF',
            borderBottom: '2px solid #404040',
            borderRight: '2px solid #404040',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          All OFF
        </button>
        <button
          onClick={resetAll}
          style={{
            flex: 1,
            padding: '4px 8px',
            backgroundColor: '#C0C0C0',
            border: 'none',
            borderTop: '2px solid #FFFFFF',
            borderLeft: '2px solid #FFFFFF',
            borderBottom: '2px solid #404040',
            borderRight: '2px solid #404040',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          Reset
        </button>
      </div>

      {/* フィルターリスト */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 4,
        }}
      >
        {(Object.keys(state) as (keyof PostEffectsState)[]).map((filterName) => {
          const filter = state[filterName];
          const isExpanded = expandedFilters.has(filterName);
          const ranges = parameterRanges[filterName] || {};
          const paramKeys = Object.keys(filter.params).filter(
            (k) => typeof filter.params[k] === 'number' && k !== 'color'
          );
          const hasColorParam = 'color' in filter.params;
          const hasBoolParams = Object.keys(filter.params).some(
            (k) => typeof filter.params[k] === 'boolean'
          );

          return (
            <div
              key={filterName}
              style={{
                marginBottom: 4,
                backgroundColor: filter.enabled ? '#E0E0E0' : '#C0C0C0',
                border: '1px solid #808080',
              }}
            >
              {/* フィルターヘッダー */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 6px',
                  gap: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={filter.enabled}
                  onChange={() => toggleFilter(filterName)}
                  style={{ cursor: 'pointer' }}
                />
                <span
                  style={{
                    flex: 1,
                    fontWeight: filter.enabled ? 'bold' : 'normal',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleFilter(filterName)}
                >
                  {filterLabels[filterName]}
                </span>
                {(paramKeys.length > 0 || hasColorParam || hasBoolParams) && (
                  <button
                    onClick={() => toggleExpanded(filterName)}
                    style={{
                      width: 18,
                      height: 18,
                      backgroundColor: '#C0C0C0',
                      border: 'none',
                      borderTop: '1px solid #FFFFFF',
                      borderLeft: '1px solid #FFFFFF',
                      borderBottom: '1px solid #404040',
                      borderRight: '1px solid #404040',
                      cursor: 'pointer',
                      fontSize: '10px',
                      lineHeight: '14px',
                    }}
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                )}
              </div>

              {/* パラメータ */}
              {isExpanded && filter.enabled && (
                <div
                  style={{
                    padding: '4px 6px',
                    borderTop: '1px solid #808080',
                    backgroundColor: '#D0D0D0',
                  }}
                >
                  {/* 色パラメータ */}
                  {hasColorParam && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 4,
                        gap: 6,
                      }}
                    >
                      <span style={{ width: 80, fontSize: '10px' }}>color</span>
                      <input
                        type="color"
                        value={numberToHex(filter.params.color as number)}
                        onChange={(e) =>
                          updateParam(filterName, 'color', hexToNumber(e.target.value))
                        }
                        style={{ width: 40, height: 20, cursor: 'pointer', border: 'none' }}
                      />
                    </div>
                  )}

                  {/* 数値パラメータ */}
                  {paramKeys.map((paramName) => {
                    const range = ranges[paramName] || { min: 0, max: 10, step: 0.1 };
                    const value = filter.params[paramName] as number;

                    return (
                      <div
                        key={paramName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: 4,
                          gap: 6,
                        }}
                      >
                        <span style={{ width: 80, fontSize: '10px' }}>{paramName}</span>
                        <input
                          type="range"
                          min={range.min}
                          max={range.max}
                          step={range.step}
                          value={value}
                          onChange={(e) =>
                            updateParam(filterName, paramName, parseFloat(e.target.value))
                          }
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <span style={{ width: 36, fontSize: '10px', textAlign: 'right' }}>
                          {value.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}

                  {/* ブーリアンパラメータ */}
                  {Object.keys(filter.params)
                    .filter((k) => typeof filter.params[k] === 'boolean')
                    .map((paramName) => (
                      <div
                        key={paramName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: 4,
                          gap: 6,
                        }}
                      >
                        <span style={{ width: 80, fontSize: '10px' }}>{paramName}</span>
                        <input
                          type="checkbox"
                          checked={filter.params[paramName] as boolean}
                          onChange={(e) => updateParam(filterName, paramName, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ステータスバー */}
      <div
        style={{
          padding: '2px 6px',
          borderTop: '1px solid #808080',
          fontSize: '10px',
          color: '#404040',
          flexShrink: 0,
        }}
      >
        Active: {Object.values(state).filter((f) => f.enabled).length} filters
      </div>
    </div>
  );
}
