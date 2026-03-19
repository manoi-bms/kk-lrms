// T080: ContractionTable — table of contraction data
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ContractionEntry } from '@/types/api';

interface ContractionTableProps {
  contractions: ContractionEntry[];
}

const INTENSITY_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  MILD: { label: 'เบา', variant: 'secondary' },
  MODERATE: { label: 'ปานกลาง', variant: 'default' },
  STRONG: { label: 'รุนแรง', variant: 'destructive' },
};

export function ContractionTable({ contractions }: ContractionTableProps) {
  if (contractions.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">การหดรัดตัวของมดลูก (UC)</h3>
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          ยังไม่มีข้อมูลการหดรัดตัว
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">การหดรัดตัวของมดลูก (UC)</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เวลา</TableHead>
              <TableHead>ระยะห่าง (นาที)</TableHead>
              <TableHead>ระยะเวลา (วินาที)</TableHead>
              <TableHead>ความรุนแรง</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractions.map((c, i) => {
              const config = INTENSITY_CONFIG[c.intensity] ?? INTENSITY_CONFIG.MILD;
              return (
                <TableRow key={i}>
                  <TableCell className="text-sm">
                    {new Date(c.measuredAt).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>{c.intervalMin ?? '-'}</TableCell>
                  <TableCell>{c.durationSec ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
