// BedTileFull — one bed on the ward board (direction C, sub-project 3 spec).
// A self-contained patient summary: identity, admission context, nurse-note
// vitals, labour progress, contractions/FHR, fluids and chronology. Colour
// marks only the labour stage and alarms (spec D3/D4). The stage rule is
// classifyLabourStage (src/services/ward-board.ts), shared with the KPI
// masthead. Sources: BP/T/P/R/SpO2/pain = ipd_nurse_note; Cx/Stn/FHR/
// contractions/oxytocin/IV/membranes = ipt_labour_partograph (latest rows).
'use client';

import type { ReactNode } from 'react';
import type { BedOccupancyFull } from '@/types/maternity-ward';
import type { ConnectionConfig } from '@/types/bms-browser';
import type { MaternalScreenSummaryItem } from '@/types/api';
import { maskName } from '@/lib/pii-mask';
import { cn } from '@/lib/utils';
import { PatientPhoto } from '@/components/shared/PatientPhoto';
import { classifyLabourStage, LABOUR_STAGE_CM } from '@/services/ward-board';
import { LABOUR_STAGE_DISPLAY } from '@/config/ward-display';
import {
  MATERNAL_SCREEN_TIER_LABEL_TH,
  MATERNAL_SCREEN_TIER_COLOR,
  EMERGENCY_ACUITY_LABEL_TH,
  EMERGENCY_ACUITY_COLOR,
  MATERNAL_SCREEN_FALLBACK_COLOR,
} from '@/config/maternal-screen-display';

export interface BedTileFullProps {
  bedno: string;
  bedLock: 'Y' | 'N' | null;
  occupant: BedOccupancyFull | null;
  /** Live "now" (ms since epoch) — drives hours-since-admit + crit
   *  classification so every tile in the ward shares a single render cadence.
   *  Required (no fallback to Date.now()) so the component stays render-pure
   *  under react-hooks/purity. */
  now: number;
  onClick?: (an: string) => void;
  /** Active BMS connection — enables the patient face photo (fetched by HN).
   *  Optional so the tile still renders (with a placeholder) in tests/contexts
   *  without a live session. */
  config?: ConnectionConfig | null;
  marketplaceToken?: string | null;
  /**
   * Cross-source maternal-screen summary for THIS occupant (Phase 6 Task H4,
   * docs/superpowers/plans/2026-07-17-maternal-screening-hosxp.md GC-H3/GC-H4).
   * Resolved by the caller (WardLayoutViewFull, keyed by `occupant.an`) from
   * the central-DB `useMaternalScreenSummaries` fetch — this tile never
   * fetches on its own. `undefined`/`null`, or a summary with both axes
   * null, renders zero DOM here: a missing/failed central fetch must degrade
   * to "no chips", never an error tile (GC-H4).
   */
  maternalScreenSummary?: MaternalScreenSummaryItem | null;
}

// ─── formatting (old output, Thai units) ────────────────────────────────────

function fmt(v: unknown, suffix = ''): string {
  if (v === null || v === undefined || v === '') return '—';
  return `${v}${suffix}`;
}

function fmtBp(sys: number | null, dia: number | null): string {
  if (sys === null && dia === null) return '—';
  return `${sys ?? '—'}/${dia ?? '—'}`;
}

function fmtTemp(t: number | null): string {
  if (t === null || t === undefined) return '—';
  return t.toFixed(1);
}

function fmtDecimal(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toFixed(digits).replace(/\.0+$/, '');
}

function fmtBodyMetrics(o: BedOccupancyFull): string {
  const weight = o.last_weight ?? o.admit_bw_kg;
  const height = o.last_height ?? o.patient_height;
  const items = [
    weight !== null && weight !== undefined ? `BW ${fmtDecimal(weight)} kg` : null,
    height !== null && height !== undefined ? `Ht ${Math.round(height)} cm` : null,
    o.last_bsa !== null && o.last_bsa !== undefined ? `BSA ${fmtDecimal(o.last_bsa, 2)}` : null,
  ].filter(Boolean);
  return items.length > 0 ? items.join(' · ') : '—';
}

/** Age of the maternal-screen assessment, from the tile's `now`
 *  (render purity: no Date.now() in render). */
function fmtScreenAge(assessedAt: string | null, now: number): string | null {
  if (!assessedAt) return null;
  const ms = Date.parse(assessedAt);
  if (!Number.isFinite(ms)) return null;
  const diffMin = Math.floor(Math.max(0, now - ms) / 60_000);
  if (diffMin < 60) return `${Math.max(1, diffMin)} นาที`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชม.`;
  return `${Math.floor(diffHr / 24)} วัน`;
}

function fmtHours(regdate: string, regtime: string | null, now: number): string {
  const ms = Date.parse(`${regdate}T${regtime ?? '00:00:00'}`);
  if (!Number.isFinite(ms)) return '—';
  const diff = Math.max(0, now - ms);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtAssessTime(date: string | null, time: string | null): string {
  if (!date && !time) return '—';
  return time ? time.slice(0, 5) : '—';
}

function thaiName(o: BedOccupancyFull): string {
  const raw = [o.pname, o.fname, o.lname].filter(Boolean).join(' ').trim();
  return raw ? maskName(raw) : 'ไม่ระบุชื่อ';
}

function calcAge(birthday: string | null, now: number): number | null {
  if (!birthday) return null;
  const bd = Date.parse(birthday);
  if (!Number.isFinite(bd)) return null;
  const ageMs = now - bd;
  if (ageMs < 0) return null;
  return Math.floor(ageMs / (365.25 * 24 * 3_600_000));
}

function contractionText(o: BedOccupancyFull): string {
  if (o.last_contr_freq === null && o.last_contr_duration === null && o.last_contr_strength === null) return '—';
  return [
    o.last_contr_freq !== null ? `${o.last_contr_freq}/10 นาที` : '—',
    o.last_contr_duration !== null ? `${o.last_contr_duration} วินาที` : '—',
    o.last_contr_strength ?? '—',
  ].join(' · ');
}

/** Cervix bar colour, unchanged: < 4 cm red, ≥ 7 cm amber, otherwise brand
 *  (the same cut-offs as the stage rule). */
type CxTone = 'danger' | 'warn' | 'brand';
function cervixTone(cx: number | null): CxTone {
  if (cx === null) return 'brand';
  if (cx >= LABOUR_STAGE_CM.transitionFrom) return 'warn';
  if (cx < LABOUR_STAGE_CM.activeFrom) return 'danger';
  return 'brand';
}
const CX_BAR: Record<CxTone, string> = { danger: 'bg-danger', warn: 'bg-warn', brand: 'bg-brand' };
const CX_TEXT: Record<CxTone, string> = { danger: 'text-danger-text', warn: 'text-warn-text', brand: 'text-ink' };

function cervixFillPercent(cx: number | null): number {
  if (cx === null) return 0;
  return Math.min(100, Math.max(0, (cx / 10) * 100));
}

// ─── building blocks ────────────────────────────────────────────────────────

const TILE = 'flex min-w-0 flex-col overflow-hidden rounded-2xl border';
const PILL = 'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-caption font-semibold';

function TileHead({ bedno, pill, className }: { bedno: string; pill: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 border-b border-border px-4 py-2', className)}>
      <span className="text-title tabular-nums text-ink">เตียง {bedno}</span>
      {pill}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border px-4 py-2">
      <div className="mb-1 text-caption font-semibold text-brand">{title}</div>
      {children}
    </div>
  );
}

function Field({ k, v, className }: { k: string; v: string; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-caption text-ink-muted">{k}</div>
      <div title={v} className="truncate text-body font-semibold tabular-nums text-ink">
        {v}
      </div>
    </div>
  );
}

function VacantTile({ bedno, locked }: { bedno: string; locked: boolean }) {
  return (
    <article
      data-testid={`bed-${bedno}`}
      data-stage={locked ? 'locked' : 'empty'}
      className={cn(
        TILE,
        'min-h-64 border-dashed border-border bg-surface-page',
        locked ? 'cursor-not-allowed' : 'cursor-default',
      )}
    >
      <TileHead
        bedno={bedno}
        className="bg-surface-muted"
        pill={<span className={cn(PILL, 'border-border text-ink-muted')}>{locked ? 'ปิดใช้งาน' : 'เตียงว่าง'}</span>}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-8 text-center">
        <span className={cn('text-title', locked ? 'text-ink-muted' : 'text-brand')}>{locked ? 'ปิดบำรุง' : 'ว่าง'}</span>
        <span className="text-body text-ink-muted">{locked ? 'ล็อกใน HOSxP' : 'พร้อมรับผู้คลอด'}</span>
      </div>
    </article>
  );
}

/** Maternal-screen pill. Its colour comes from the display config (GC-H3)
 *  and never changes the tile border/background, which is reserved for the stage alarm. */
function ScreenPill({ testId, color, children }: { testId: string; color: string; children: ReactNode }) {
  return (
    <span data-testid={testId} className={PILL} style={{ color, borderColor: color }}>
      {children}
    </span>
  );
}

// ─── tile ───────────────────────────────────────────────────────────────────

export function BedTileFull({
  bedno,
  bedLock,
  occupant,
  now,
  onClick,
  config,
  marketplaceToken,
  maternalScreenSummary,
}: BedTileFullProps) {
  // B1: an admitted patient always wins over the lock flag.
  if (!occupant) return <VacantTile bedno={bedno} locked={bedLock === 'Y'} />;

  const stage = classifyLabourStage(occupant, now);
  const display = LABOUR_STAGE_DISPLAY[stage];
  const alarm = stage === 'prolongedLatent';
  const name = thaiName(occupant);
  const age = calcAge(occupant.birthday, now);
  const cx = occupant.last_cervix_cm;
  const cxTone = cervixTone(cx);
  const allergies = occupant.allergy_count ?? 0;

  // Cross-source maternal-screen pills (Task H4): zero DOM unless one axis is present (GC-H4).
  const screenTier = maternalScreenSummary?.localTier ?? null;
  const screenAcuity = maternalScreenSummary?.emergencyAcuity ?? null;
  const showScreenPills = screenTier !== null || screenAcuity !== null;
  const screenAgeLabel = showScreenPills ? fmtScreenAge(maternalScreenSummary?.assessedAt ?? null, now) : null;

  const demographics = [
    age !== null ? `อายุ ${age} ปี` : null,
    occupant.gravida !== null ? `G${occupant.gravida}` : null,
    occupant.ga !== null ? `GA ${occupant.ga} สัปดาห์` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      data-testid={`bed-${bedno}`}
      data-stage={stage}
      onClick={() => onClick?.(occupant.an)}
      className={cn(
        TILE,
        'cursor-pointer bg-surface-card shadow-soft transition-shadow hover:shadow-md',
        alarm ? 'border-2 border-danger' : 'border-border',
      )}
    >
      <TileHead
        bedno={bedno}
        className={alarm ? 'bg-danger-tint' : 'bg-surface-muted'}
        pill={
          <span title={display.hint} className={cn('whitespace-nowrap rounded-full px-3 py-1 text-label', display.className)}>
            {display.labelTh}
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2 text-label text-ink-muted">
        <span>
          AN <b className="font-semibold text-ink">{occupant.an}</b>
        </span>
        <span>
          HN <b className="font-semibold text-ink">{occupant.hn}</b>
        </span>
        <span className="flex flex-wrap items-center gap-1">
          {allergies > 0 ? (
            <span title={`มีประวัติแพ้ยา ${allergies} รายการ`} className={cn(PILL, 'border-danger bg-danger text-white')}>
              แพ้ยา
            </span>
          ) : (
            <span title="ไม่มีประวัติแพ้ยาในระบบ" className={cn(PILL, 'border-ok/40 text-ok-text')}>
              ไม่มีประวัติแพ้ยา
            </span>
          )}
          {occupant.blood_grp && (
            <span title={`หมู่เลือด ${occupant.blood_grp}`} className={cn(PILL, 'border-border text-ink')}>
              {occupant.blood_grp}
            </span>
          )}
          {bedLock === 'Y' && (
            <span data-testid="bed-locked-occupied" className={cn(PILL, 'border-warn/40 bg-warn-tint text-warn-text')}>
              เตียงถูกล็อกใน HOSxP
            </span>
          )}
          {showScreenPills && (
            <span
              data-testid="bed-maternal-screen"
              title="การคัดกรองท้องถิ่น (โหมดเงา — ยังไม่ได้รับการรับรอง)"
              className="flex items-center gap-1"
            >
              {screenTier && (
                <ScreenPill
                  testId="bed-maternal-screen-tier"
                  color={MATERNAL_SCREEN_TIER_COLOR[screenTier] ?? MATERNAL_SCREEN_FALLBACK_COLOR}
                >
                  {MATERNAL_SCREEN_TIER_LABEL_TH[screenTier]}
                </ScreenPill>
              )}
              {screenAcuity && (
                <ScreenPill
                  testId="bed-maternal-screen-acuity"
                  color={EMERGENCY_ACUITY_COLOR[screenAcuity] ?? MATERNAL_SCREEN_FALLBACK_COLOR}
                >
                  {EMERGENCY_ACUITY_LABEL_TH[screenAcuity]}
                </ScreenPill>
              )}
              {screenAgeLabel && (
                <span data-testid="bed-maternal-screen-age" className="text-caption text-ink-muted">
                  {screenAgeLabel}
                </span>
              )}
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <PatientPhoto hn={occupant.hn} config={config} marketplaceToken={marketplaceToken} name={name} size={46} />
        <div className="min-w-0">
          <div className="truncate text-body-lg font-semibold text-ink">{name}</div>
          {demographics && <div className="text-label text-ink-muted">{demographics}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-border bg-surface-page px-4 py-2">
        <Field k="แพทย์" v={fmt(occupant.incharge_doctor_name)} />
        <Field k="สิทธิ" v={fmt(occupant.pttype_name)} />
        <Field k="ร่างกาย" v={fmtBodyMetrics(occupant)} className="col-span-2" />
        {occupant.prediag && (
          <div className="col-span-2 min-w-0">
            <div className="text-caption font-semibold text-warn-text">อาการแรกรับ</div>
            <div title={occupant.prediag} className="truncate text-body text-ink">
              {occupant.prediag}
            </div>
          </div>
        )}
      </div>

      <Section title="สัญญาณชีพ (บันทึกพยาบาล)">
        <div className="grid grid-cols-3 gap-x-3 gap-y-1">
          <Field k="BP" v={fmtBp(occupant.last_bp_sys, occupant.last_bp_dia)} />
          <Field k="T (°C)" v={fmtTemp(occupant.last_temp)} />
          <Field k="P" v={fmt(occupant.last_pulse)} />
          <Field k="R" v={fmt(occupant.last_rr)} />
          <Field k="SpO₂ RA" v={fmt(occupant.last_spo2)} />
          <Field k="O₂" v={fmt(occupant.last_spo2_o2)} />
        </div>
      </Section>

      <Section title="ความก้าวหน้าการคลอด (พาร์โทกราฟ)">
        <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-x-3 gap-y-1">
          <div className="min-w-0">
            <div className="text-caption text-ink-muted">ปากมดลูก</div>
            <div className={cn('text-body font-semibold tabular-nums', CX_TEXT[cxTone])}>
              {cx !== null ? `${cx} ซม.` : '—'}
            </div>
            <div aria-hidden="true" className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
              <div className={cn('h-full rounded-full', CX_BAR[cxTone])} style={{ width: `${cervixFillPercent(cx)}%` }} />
            </div>
          </div>
          <Field k="ส่วนนำ" v={fmt(occupant.last_station)} />
          <Field k="ถุงน้ำ" v={fmt(occupant.last_amniotic)} />
          <Field k="ปวด" v={occupant.last_pain !== null ? `${occupant.last_pain}/10` : '—'} />
        </div>
      </Section>

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] border-b border-border">
        <div className="min-w-0 px-4 py-2">
          <div className="mb-1 text-caption font-semibold text-brand">การหดรัดตัว</div>
          <div className="text-body font-semibold tabular-nums text-ink">{contractionText(occupant)}</div>
        </div>
        <div className="min-w-0 border-l border-border px-4 py-2 text-right">
          <div className="mb-1 text-caption font-semibold text-brand">FHR (ครั้ง/นาที)</div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-title tabular-nums text-ink">{fmt(occupant.last_fhr)}</span>
            {occupant.last_fhr !== null && (
              <span
                data-testid="fhr-pulse"
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full bg-brand motion-safe:animate-[kk-heartbeat_0.85s_ease-in-out_infinite]"
              />
            )}
          </div>
        </div>
      </div>

      <Section title="สารน้ำและยา">
        <div className="grid grid-cols-3 gap-x-3 gap-y-1">
          <Field k="IV" v={fmt(occupant.last_iv_fluids)} />
          <Field k="Oxytocin" v={occupant.last_oxytocin_uml !== null ? `${occupant.last_oxytocin_uml} mU/นาที` : '—'} />
          <Field k="หยด" v={fmt(occupant.last_oxytocin_drops, ' หยด/นาที')} />
        </div>
      </Section>

      <div
        className={cn(
          'mt-auto flex flex-wrap justify-between gap-x-3 gap-y-1 px-4 py-2 text-label tabular-nums',
          alarm ? 'bg-danger-tint text-danger-text' : 'bg-surface-muted text-ink',
        )}
      >
        <span>
          <span className="text-ink-muted">รับเข้า</span> {(occupant.regtime ?? '').slice(0, 5) || '—'}
        </span>
        <span>
          <span className="text-ink-muted">นาน</span> {fmtHours(occupant.regdate, occupant.regtime, now)} ชม.
        </span>
        <span>
          <span className="text-ink-muted">บันทึกล่าสุด</span>{' '}
          {fmtAssessTime(occupant.last_assess_date, occupant.last_assess_time)}
          {occupant.last_assess_staff ? ` · ${occupant.last_assess_staff}` : ''}
        </span>
      </div>
    </article>
  );
}
