import { useState, useEffect, useRef } from 'react';
import { useRestaurantStore, useShopStore, useMenuStore } from '../store';
import { useEntityStore } from '../store/entityStore';
import { useEventStore } from '../store/eventStore';
import { LIT_PER_DAY } from '../constants/game';
import { WindowDialog, WindowButton } from './ui';

export const DayEndWindow = () => {
  const {
    isDayEnded,
    showDayEnd,
    currentDay,
    money,
    currentRent,
    isGameOver,
    rentPaid,
    payRent,
    startNextDay,
    clearAllSeats,
    clearAllOrders,
    addMoney,
    addLit,
    lit,
    openUpgrade,
  } = useRestaurantStore();
  const { customers, clearAllCustomers, resetAllStaff } = useEntityStore();
  const { refreshLineup } = useShopStore();
  const { openMenuSelect } = useMenuStore();
  const { selectRandomEvent } = useEventStore();

  // 家賃支払い状態の管理
  const [hasAttemptedPayment, setHasAttemptedPayment] = useState(false);
  // 清算処理が完了したか
  const hasSettledRef = useRef(false);
  // 所持金減少アニメーション用
  const [displayMoney, setDisplayMoney] = useState(money);
  const [isAnimating, setIsAnimating] = useState(false);

  // 日終了時（showDayEnd=true時）に自動で清算処理を行う
  useEffect(() => {
    if (showDayEnd && !hasSettledRef.current) {
      hasSettledRef.current = true;

      // 食事中のお客さんから即座にお金を回収
      let totalEarnings = 0;
      for (const customer of customers) {
        // 店内にいるお客さん（entering, seated, ordering, waiting, eating）から支払いを受ける
        if (customer.state !== 'leaving' && customer.state !== 'waiting_outside' && customer.state !== 'paying') {
          if (customer.orderedFood) {
            totalEarnings += customer.orderedFood.price;
          }
        }
      }

      // 稼いだお金を追加
      if (totalEarnings > 0) {
        addMoney(totalEarnings);
      }

      // 1日終了ボーナス：LITを獲得
      addLit(LIT_PER_DAY);

      // 全お客さんをクリア
      clearAllCustomers();
      // 全座席を解放
      clearAllSeats();
      // 全注文をクリア
      clearAllOrders();
      // スタッフを定位置に戻す（調理・配膳両方を担当）
      resetAllStaff();
    }
  }, [showDayEnd, customers, addMoney, addLit, clearAllCustomers, clearAllSeats, clearAllOrders, resetAllStaff]);

  // showDayEnd時に自動で家賃支払いを試みる
  useEffect(() => {
    if (showDayEnd && !rentPaid && !hasAttemptedPayment && !isGameOver) {
      setHasAttemptedPayment(true);
      payRent();
    }
  }, [showDayEnd, rentPaid, hasAttemptedPayment, isGameOver, payRent]);

  // 新しい日が始まったらリセット
  useEffect(() => {
    if (!isDayEnded && !showDayEnd) {
      setHasAttemptedPayment(false);
      hasSettledRef.current = false;
    }
  }, [isDayEnded, showDayEnd]);

  // showDayEndが表示された時にdisplayMoneyを初期化
  useEffect(() => {
    if (showDayEnd) {
      setDisplayMoney(money + currentRent); // 家賃支払い前の金額
      setIsAnimating(false);
    }
  }, [showDayEnd, money, currentRent]);

  // showDayEndがtrueの時だけ表示（ゲームオーバー時は別ウィンドウで処理）
  if (!showDayEnd || isGameOver) return null;

  // 家賃支払い後の残高
  const remainingMoney = rentPaid ? money : money - currentRent;

  const handleNextDay = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    const startMoney = money + currentRent;
    const endMoney = money;
    const duration = 1000; // 1秒
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // イージング
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startMoney - (startMoney - endMoney) * eased);
      setDisplayMoney(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // アニメーション完了後、次の日へ
        setTimeout(() => {
          // 3日ごとにアップグレードウィンドウを表示
          const nextDay = currentDay + 1;
          const shouldShowUpgrade = nextDay >= 3 && nextDay % 3 === 0;

          refreshLineup();
          selectRandomEvent(); // 次の日のイベントを選択
          startNextDay();

          if (shouldShowUpgrade) {
            openUpgrade();
          } else {
            openMenuSelect(); // メニュー選択ウィンドウを開く
          }
        }, 300);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <WindowDialog
      title={`Day ${currentDay} - 営業終了`}
      width="400px"
      zIndex={1000}
    >
      {/* 売上・所持金表示 */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>
          {isAnimating ? '所持金' : '本日の売上'}
        </div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: isAnimating ? (displayMoney < money + currentRent ? '#CC0000' : '#006400') : '#006400',
            transition: 'color 0.3s',
          }}
        >
          {isAnimating ? displayMoney : money + currentRent} 円
        </div>
      </div>

      {/* 家賃表示 */}
      <div
        style={{
          backgroundColor: '#FFF0F0',
          borderTop: '1px solid #808080',
          borderLeft: '1px solid #808080',
          borderBottom: '1px solid #FFFFFF',
          borderRight: '1px solid #FFFFFF',
          padding: '12px',
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '12px', color: '#333', marginBottom: '4px' }}>
          本日の家賃（ノルマ）
        </div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#CC0000',
            marginBottom: '8px',
          }}
        >
          -{currentRent} 円
        </div>
        <div
          style={{
            fontSize: '14px',
            color: rentPaid ? '#006400' : '#CC0000',
            fontWeight: 'bold',
          }}
        >
          残高: {isAnimating ? displayMoney : remainingMoney} 円
        </div>
      </div>

      {/* LIT獲得表示 */}
      <div
        style={{
          backgroundColor: '#FFF8E1',
          borderTop: '1px solid #808080',
          borderLeft: '1px solid #808080',
          borderBottom: '1px solid #FFFFFF',
          borderRight: '1px solid #FFFFFF',
          padding: '12px',
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '12px', color: '#333', marginBottom: '4px' }}>
          1日終了ボーナス
        </div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#ff6600',
          }}
        >
          🔥 +{LIT_PER_DAY} LIT
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '4px',
          }}
        >
          所持: {lit} LIT
        </div>
      </div>

      {/* ボタン */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <WindowButton
          onClick={handleNextDay}
          disabled={isAnimating}
          size="large"
        >
          {isAnimating ? '支払い中...' : '次の日へ'}
        </WindowButton>
      </div>
    </WindowDialog>
  );
};
