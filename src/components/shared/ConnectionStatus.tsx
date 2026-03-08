// T041: ConnectionStatus — status dot + label + last sync timestamp
'use client';

import { ConnectionStatus as ConnectionStatusEnum } from '@/types/domain';
import { cn } from '@/lib/utils';
import { formatThaiDate, formatThaiTime } from '@/lib/utils';

interface ConnectionStatusProps {
  status: ConnectionStatusEnum;
  lastSyncAt?: Date | string | null;
  className?: string;
}

const STATUS_CONFIG = {
  [ConnectionStatusEnum.ONLINE]: {
    color: '#22c55e',
    label: 'ออนไลน์',
    dotClass: 'bg-green-500',
  },
  [ConnectionStatusEnum.OFFLINE]: {
    color: '#ef4444',
    label: 'ออฟไลน์',
    dotClass: 'bg-red-500',
  },
  [ConnectionStatusEnum.UNKNOWN]: {
    color: '#9ca3af',
    label: 'ไม่ทราบ',
    dotClass: 'bg-gray-400',
  },
};

export function ConnectionStatus({ status, lastSyncAt, className }: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span
        className={cn('inline-block h-2 w-2 rounded-full', config.dotClass)}
        aria-hidden="true"
      />
      <span style={{ color: config.color }}>{config.label}</span>
      {lastSyncAt && (
        <span className="text-xs text-muted-foreground">
          ({formatThaiDate(lastSyncAt)} {formatThaiTime(lastSyncAt)})
        </span>
      )}
    </span>
  );
}
