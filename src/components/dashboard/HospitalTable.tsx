// T055: HospitalTable — sortable table of hospitals with risk counts
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';
import type { DashboardHospital } from '@/types/api';
import { ConnectionStatus as ConnectionStatusEnum } from '@/types/domain';

interface HospitalTableProps {
  hospitals: DashboardHospital[];
}

type SortKey = 'name' | 'level' | 'low' | 'medium' | 'high' | 'total';
type SortDir = 'asc' | 'desc';

export function HospitalTable({ hospitals }: HospitalTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...hospitals].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'name':
        return a.name.localeCompare(b.name, 'th') * dir;
      case 'level':
        return a.level.localeCompare(b.level) * dir;
      case 'low':
        return (a.counts.low - b.counts.low) * dir;
      case 'medium':
        return (a.counts.medium - b.counts.medium) * dir;
      case 'high':
        return (a.counts.high - b.counts.high) * dir;
      case 'total':
        return (a.counts.total - b.counts.total) * dir;
      default:
        return 0;
    }
  });

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => handleSort(k)}
    >
      {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </TableHead>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader label="โรงพยาบาล" k="name" />
            <SortHeader label="ระดับ" k="level" />
            <SortHeader label="เสี่ยงต่ำ" k="low" />
            <SortHeader label="เสี่ยงปานกลาง" k="medium" />
            <SortHeader label="เสี่ยงสูง" k="high" />
            <SortHeader label="รวม" k="total" />
            <TableHead>สถานะ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((h) => (
            <TableRow
              key={h.hcode}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/hospitals/${h.hcode}`)}
            >
              <TableCell className="font-medium">{h.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{h.level}</Badge>
              </TableCell>
              <TableCell>
                {h.counts.low > 0 && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm text-green-700">
                    {h.counts.low}
                  </span>
                )}
                {h.counts.low === 0 && <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell>
                {h.counts.medium > 0 && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-sm text-yellow-700">
                    {h.counts.medium}
                  </span>
                )}
                {h.counts.medium === 0 && <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell>
                {h.counts.high > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-sm font-bold text-red-700">
                    {h.counts.high}
                  </span>
                )}
                {h.counts.high === 0 && <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell className="font-semibold">{h.counts.total || '-'}</TableCell>
              <TableCell>
                <ConnectionStatus
                  status={h.connectionStatus as ConnectionStatusEnum}
                  lastSyncAt={h.lastSyncAt}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
