// T070: PartogramChart — Recharts partogram with alert/action reference lines
'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { PartogramEntry } from '@/types/api';

interface PartogramChartProps {
  entries: PartogramEntry[];
  startTime: string;
}

function hoursFromStart(measuredAt: string, startTime: string): number {
  const ms = new Date(measuredAt).getTime() - new Date(startTime).getTime();
  return Math.round((ms / 3600000) * 10) / 10; // 1 decimal place
}

export function PartogramChart({ entries, startTime }: PartogramChartProps) {
  if (entries.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-muted-foreground">
        ยังไม่มีข้อมูล Partogram
      </div>
    );
  }

  const chartData = entries.map((e) => ({
    hour: hoursFromStart(e.measuredAt, startTime),
    dilation: e.dilationCm,
    alertLine: e.alertLineCm,
    actionLine: e.actionLineCm,
  }));

  const latestEntry = entries[entries.length - 1];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Partogram</h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-lg font-bold text-cyan-700">
            {latestEntry.dilationCm}
          </span>
          <span className="text-sm text-muted-foreground">cm</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="hour"
            type="number"
            domain={[0, 24]}
            ticks={[0, 4, 8, 12, 16, 20, 24]}
            label={{ value: 'ชั่วโมง', position: 'insideBottomRight', offset: -5 }}
          />
          <YAxis
            type="number"
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            label={{ value: 'cm', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                dilation: 'Cervix Dilation',
                alertLine: 'Alert Line',
                actionLine: 'Action Line',
              };
              return [`${value} cm`, labels[String(name)] ?? name];
            }}
            labelFormatter={(label) => `${label} ชม.`}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                dilation: 'การขยายปากมดลูก',
                alertLine: 'เส้นเตือน (Alert)',
                actionLine: 'เส้นปฏิบัติ (Action)',
              };
              return labels[value] ?? value;
            }}
          />

          {/* Dilation progress area */}
          <Area
            type="monotone"
            dataKey="dilation"
            fill="rgba(6, 182, 212, 0.2)"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={{ r: 4, fill: '#06b6d4' }}
            activeDot={{ r: 6 }}
          />

          {/* Alert line — red dashed */}
          <Line
            type="monotone"
            dataKey="alertLine"
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />

          {/* Action line — blue dashed */}
          <Line
            type="monotone"
            dataKey="actionLine"
            stroke="#3b82f6"
            strokeDasharray="8 4"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
