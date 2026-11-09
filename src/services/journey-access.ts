/**
 * Who may read a journey's most sensitive clinical data (lab results).
 *
 * The journey pages themselves are province-wide for any signed-in user. Lab
 * results include HIV and syphilis outcomes, so they are limited to hospitals
 * that actually took part in this pregnancy's care. Neither role nor the
 * exempt/read-only hcodes grant access: mapPositionToRole can make any director
 * an ADMIN, and those hcodes are not care providers.
 */
import type { DatabaseAdapter } from '@/db/adapter';

export type JourneyLabAccess = 'allowed' | 'denied' | 'not_found';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function checkJourneyLabAccess(
  db: DatabaseAdapter,
  journeyId: string,
  hospitalCode: string | null | undefined,
): Promise<JourneyLabAccess> {
  if (!UUID.test(journeyId)) return 'not_found';
  const journeys = await db.query<{ id: string }>('SELECT id FROM maternal_journeys WHERE id = ?', [
    journeyId,
  ]);
  if (journeys.length === 0) return 'not_found';
  if (!hospitalCode) return 'denied';

  const linked = await db.query<{ id: string }>(
    `SELECT h.id
       FROM hospitals h
       INNER JOIN maternal_journeys mj ON mj.id = ?
      WHERE h.hcode = ?
        AND (mj.hospital_id = h.id
          OR mj.current_hospital_id = h.id
          OR EXISTS (SELECT 1 FROM cached_anc_visits v
                      WHERE v.journey_id = mj.id AND v.hospital_id = h.id)
          OR EXISTS (SELECT 1 FROM cached_anc_lab_results l
                      WHERE l.journey_id = mj.id AND l.hospital_id = h.id)
          OR EXISTS (SELECT 1 FROM cached_patients p
                      WHERE p.journey_id = mj.id AND p.hospital_id = h.id)
          OR EXISTS (SELECT 1 FROM cached_referrals r
                      WHERE r.journey_id = mj.id
                        AND (r.from_hospital_id = h.id OR r.to_hospital_id = h.id)))`,
    [journeyId, hospitalCode],
  );
  return linked.length > 0 ? 'allowed' : 'denied';
}
