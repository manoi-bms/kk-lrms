'use client';
import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RiskLevel } from '@/types/domain';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  numeric?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowRisk?: (row: T) => RiskLevel | null | undefined;
  loading?: boolean;
  empty?: ReactNode;
  caption?: string;
  onRowClick?: (row: T) => void;
}

const RISK_ROW: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'bg-ok-tint',
  [RiskLevel.MEDIUM]: 'bg-warn-tint',
  [RiskLevel.HIGH]: 'bg-danger-tint',
};

const SKELETON_ROWS = 3;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowRisk,
  loading = false,
  empty,
  caption,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <Table aria-busy={loading ? 'true' : undefined} aria-label={caption}>
      {caption && <TableCaption className="sr-only">{caption}</TableCaption>}
      <TableHeader className="sticky top-0 z-10 bg-surface-muted">
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.key} className={cn('text-label text-ink-muted', c.numeric && 'text-right')}>
              {c.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading &&
          Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <TableRow key={`sk-${i}`} className="animate-pulse">
              {columns.map((c) => (
                <TableCell key={c.key}>
                  <div className="h-4 rounded bg-surface-muted" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        {!loading && rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={columns.length} className="py-8 text-center text-body text-ink-muted">
              {empty ?? 'ไม่มีข้อมูล'}
            </TableCell>
          </TableRow>
        )}
        {!loading &&
          rows.map((row) => {
            const risk = rowRisk?.(row);
            return (
              <TableRow
                key={rowKey(row)}
                className={cn(risk && RISK_ROW[risk], onRowClick && 'cursor-pointer hover:brightness-[0.98]')}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter') onRowClick(row);
                      }
                    : undefined
                }
              >
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={cn('text-body', c.numeric && 'text-right tabular-nums', c.className)}
                  >
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
      </TableBody>
    </Table>
  );
}
