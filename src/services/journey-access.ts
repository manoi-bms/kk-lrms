/**
 * Who may read a journey's lab results, which include HIV and syphilis outcomes.
 * The journey pages are province-wide, so this is the only gate on these rows.
 *
 * A link counts as full access only if another party vouches for it. A hospital
 * can create its own visit, lab, admission or referral-from rows, or set
 * current_hospital_id, simply by pushing data, so those cannot unlock anyone
 * else's results. They unlock only rows from that hospital, which it already
 * holds in its own HOSxP, so a fabricated row reveals nothing.
 *
 * Role and the exempt or read-only hcodes grant nothing: mapPositionToRole can
 * make any director an ADMIN, and those hcodes are not care providers.
 */
import type { DatabaseAdapter } from '@/db/adapter';
import { listJourneyLabResults, type JourneyLabResult } from '@/services/anc-lab-results';
import { ReferralStatus } from '@/types/domain';

export type JourneyLabTier = 'full' | 'own_results';

export type JourneyLabRead =
  | { status: 'not_found' }
  | { status: 'denied' }
  | { status: 'ok'; tier: JourneyLabTier; results: JourneyLabResult[] };

/**
 * Pending referrals count because receiving staff need results before arrival;
 * the sender is the other, authenticated hospital. Rejected and expired do not.
 */
const FULL_ACCESS_REFERRAL_STATUSES = [
  ReferralStatus.INITIATED,
  ReferralStatus.ACCEPTED,
  ReferralStatus.IN_TRANSIT,
  ReferralStatus.ARRIVED,
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LinkRow {
  hospital_id: string;
  is_registering: boolean;
  is_referral_destination: boolean;
  has_own_records: boolean;
}

async function hospitalLink(
  db: DatabaseAdapter,
  journeyId: string,
  hospitalCode: string,
): Promise<LinkRow | undefined> {
  const placeholders = FULL_ACCESS_REFERRAL_STATUSES.map(() => '?').join(', ');
  const rows = await db.query<LinkRow>(
    `SELECT h.id AS hospital_id,
            (mj.hospital_id = h.id) AS is_registering,
            EXISTS (SELECT 1 FROM cached_referrals r
                     WHERE r.journey_id = mj.id
                       AND r.to_hospital_id = h.id
                       AND r.from_hospital_id <> r.to_hospital_id
                       AND r.status IN (${placeholders})) AS is_referral_destination,
            (EXISTS (SELECT 1 FROM cached_anc_visits v
                      WHERE v.journey_id = mj.id AND v.hospital_id = h.id)
             OR EXISTS (SELECT 1 FROM cached_anc_lab_results l
                         WHERE l.journey_id = mj.id AND l.hospital_id = h.id)
             OR EXISTS (SELECT 1 FROM cached_patients p
                         WHERE p.journey_id = mj.id AND p.hospital_id = h.id)) AS has_own_records
       FROM hospitals h
       INNER JOIN maternal_journeys mj ON mj.id = ?
      WHERE h.hcode = ?`,
    [...FULL_ACCESS_REFERRAL_STATUSES, journeyId, hospitalCode],
  );
  return rows[0];
}

/** The only way the labs route reads results, so tier and filter cannot drift. */
export async function readJourneyLabsForHospital(
  db: DatabaseAdapter,
  journeyId: string,
  hospitalCode: string | null | undefined,
): Promise<JourneyLabRead> {
  if (!UUID.test(journeyId)) return { status: 'not_found' };
  const journeys = await db.query<{ id: string }>('SELECT id FROM maternal_journeys WHERE id = ?', [
    journeyId,
  ]);
  if (journeys.length === 0) return { status: 'not_found' };
  if (!hospitalCode) return { status: 'denied' };

  const link = await hospitalLink(db, journeyId, hospitalCode);
  if (link?.is_registering || link?.is_referral_destination) {
    return { status: 'ok', tier: 'full', results: await listJourneyLabResults(db, journeyId) };
  }
  if (link?.has_own_records) {
    const results = await listJourneyLabResults(db, journeyId, {
      onlyHospitalId: link.hospital_id,
    });
    return { status: 'ok', tier: 'own_results', results };
  }
  return { status: 'denied' };
}
