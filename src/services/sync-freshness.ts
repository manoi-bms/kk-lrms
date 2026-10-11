// Province + own-hospital data freshness for the app-wide status strip.
// Staleness uses classifySyncHealth (same policy as /api/health and
// FreshnessBadge); the high-risk number reuses countActiveLaborByRisk (same
// aggregate as the dashboard). Pseudo-hospitals (EXEMPT_HCODES) never sync
// and are excluded. Returns counts only — no per-hospital list — so a
// hospital session learns nothing it can't already see on the dashboard.
import type { DatabaseAdapter } from '@/db/adapter';
import { classifySyncHealth } from '@/config/hospital-network';
import { EXEMPT_HCODES } from '@/lib/hospital-access-guard';
import { countActiveLaborByRisk } from '@/services/dashboard';
import type { FreshnessSummary } from '@/types/sync-freshness';

interface HospitalSyncRow {
  hcode: string;
  name: string;
  last_sync_at: string | Date | null;
}

function toIso(v: string | Date | null): string | null {
  if (v === null) return null;
  return v instanceof Date ? v.toISOString() : v;
}

export async function getSyncFreshness(
  db: DatabaseAdapter,
  opts: { hcode: string | null | undefined; now?: Date },
): Promise<FreshnessSummary> {
  const now = opts.now ?? new Date();
  const hospitals = await db.query<HospitalSyncRow>(
    'SELECT hcode, name, last_sync_at FROM hospitals WHERE is_active = true',
  );
  const reporting = hospitals.filter((h) => !EXEMPT_HCODES.has(h.hcode));

  const highByHcode = new Map<string, number>();
  for (const r of await countActiveLaborByRisk(db)) {
    if (r.risk_level === 'HIGH') highByHcode.set(r.hcode, (highByHcode.get(r.hcode) ?? 0) + r.count);
  }

  let fresh = 0;
  let stale = 0;
  let never = 0;
  let latest: number | null = null;
  for (const h of reporting) {
    const iso = toIso(h.last_sync_at);
    const t = iso ? new Date(iso).getTime() : NaN;
    if (!Number.isFinite(t)) {
      never += 1;
      continue;
    }
    if (t > now.getTime()) {
      stale += 1; // future-dated: same treatment as /api/health
      continue;
    }
    if (classifySyncHealth('OK', iso, now) === 'ok') fresh += 1;
    else stale += 1;
    if (latest === null || t > latest) latest = t;
  }

  let own: FreshnessSummary['own'] = null;
  if (opts.hcode && !EXEMPT_HCODES.has(opts.hcode)) {
    const h = reporting.find((x) => x.hcode === opts.hcode);
    if (h) {
      const iso = toIso(h.last_sync_at);
      own = {
        hcode: h.hcode,
        name: h.name,
        lastSyncAt: iso,
        health: classifySyncHealth('OK', iso, now),
        highRisk: highByHcode.get(h.hcode) ?? 0,
      };
    }
  }

  return {
    generatedAt: now.toISOString(),
    province: {
      reporting: reporting.length,
      fresh,
      stale,
      never,
      highRisk: reporting.reduce((sum, h) => sum + (highByHcode.get(h.hcode) ?? 0), 0),
      lastSyncAt: latest === null ? null : new Date(latest).toISOString(),
    },
    own,
  };
}
