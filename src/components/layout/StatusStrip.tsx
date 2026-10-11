// src/components/layout/StatusStrip.tsx
'use client';
import Link from 'next/link';
import { useSyncFreshness } from '@/hooks/useSyncFreshness';
import { FreshnessBadge } from '@/components/shared/FreshnessBadge';
import { describeSyncAge } from '@/lib/sync-age';
import { cn } from '@/lib/utils';

const BAR =
  'flex min-h-9 flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-surface-muted px-5 py-1.5 text-label text-ink-muted';

function Dot({ tone }: { tone: 'ok' | 'warn' | 'danger' }) {
  const cls = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger' }[tone];
  return <span aria-hidden="true" className={cn('inline-block h-2.5 w-2.5 rounded-full', cls)} />;
}

function HighRisk({ count, href }: { count: number; href: string }) {
  if (count <= 0) return <span className="ml-auto text-ok-text">ไม่มีผู้คลอดเสี่ยงสูง</span>;
  return (
    <Link href={href} className="ml-auto rounded-full bg-danger px-3 py-0.5 font-semibold text-white">
      เสี่ยงสูง {count} ราย
    </Link>
  );
}

export function StatusStrip({ variant }: { variant: 'provincial' | 'hospital' }) {
  const { data, error, isLoading, mutate } = useSyncFreshness();

  if (isLoading && !data) return <div aria-busy="true" className={BAR} />;
  if (error && !data) {
    return (
      <div className={BAR}>
        <span>ไม่สามารถตรวจสอบสถานะข้อมูลได้</span>
        <button type="button" onClick={() => void mutate()} className="underline">
          ลองใหม่
        </button>
      </div>
    );
  }
  if (!data) return null;

  if (variant === 'hospital') {
    return (
      <div className={BAR}>
        {data.own ? (
          <>
            <FreshnessBadge lastSyncAt={data.own.lastSyncAt} label="ข้อมูลจาก HOSxP ล่าสุด" />
            <HighRisk count={data.own.highRisk} href="/hospital-maternity-ward" />
          </>
        ) : (
          <span>บัญชีนี้ไม่ได้ผูกกับโรงพยาบาลที่ส่งข้อมูล</span>
        )}
      </div>
    );
  }

  const p = data.province;
  const clock = describeSyncAge(p.lastSyncAt).clock;
  return (
    <div className={BAR}>
      <span className="inline-flex items-center gap-2">
        <Dot tone="ok" />
        ข้อมูลสด{' '}
        <b className="tabular-nums text-ink">
          {p.fresh}/{p.reporting}
        </b>{' '}
        รพ.
      </span>
      {p.stale > 0 && (
        <Link href="/hospitals" className="inline-flex items-center gap-2 hover:underline">
          <Dot tone="warn" />
          ไม่ซิงค์เกิน 1 ชม. <b className="tabular-nums text-ink">{p.stale}</b> รพ.
        </Link>
      )}
      {p.never > 0 && (
        <span className="inline-flex items-center gap-2">
          <Dot tone="danger" />
          ยังไม่เคยซิงค์ <b className="tabular-nums text-ink">{p.never}</b> รพ.
        </span>
      )}
      {clock && (
        <span>
          อัปเดตล่าสุด <b className="tabular-nums text-ink">{clock}</b>
        </span>
      )}
      <HighRisk count={p.highRisk} href="/" />
    </div>
  );
}
