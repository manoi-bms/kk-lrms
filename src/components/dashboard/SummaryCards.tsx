// T054: SummaryCards — 4 cards with risk counts + real-time Bangkok clock
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSummary } from '@/types/api';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const updateClock = () => {
      setClock(
        new Date().toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: 'ผู้คลอดทั้งหมด',
      value: summary.totalActive,
      color: 'text-foreground',
      bg: 'bg-card',
    },
    {
      title: 'เสี่ยงสูง',
      value: summary.totalHigh,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'เสี่ยงปานกลาง',
      value: summary.totalMedium,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'เสี่ยงต่ำ',
      value: summary.totalLow,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={card.bg}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </CardContent>
        </Card>
      ))}
      <div className="col-span-2 flex items-center justify-end text-sm text-muted-foreground md:col-span-4">
        <span>เวลาปัจจุบัน: {clock}</span>
      </div>
    </div>
  );
}
