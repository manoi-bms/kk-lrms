// T016: Dual-dialect SQL query templates for HOSxP via BMS Session API
// No hardcoded conditions — all queries are parameterized and configurable

export type DatabaseDialect = 'postgresql' | 'mysql';

export interface SqlQueryTemplate {
  postgresql: string;
  mysql: string;
}

export function getQuery(template: SqlQueryTemplate, dialect: DatabaseDialect): string {
  return template[dialect];
}

// Active labor patients (admitted, not yet discharged)
export const ACTIVE_LABOR_PATIENTS: SqlQueryTemplate = {
  postgresql: `
    SELECT i.an, i.hn, i.regdate, i.regtime, i.ward,
           ip.preg_number, ip.ga, ip.labor_date, ip.anc_complete
    FROM ipt i
    JOIN ipt_pregnancy ip ON i.an = ip.an
    WHERE i.dchdate IS NULL
    ORDER BY i.regdate DESC`,
  mysql: `
    SELECT i.an, i.hn, i.regdate, i.regtime, i.ward,
           ip.preg_number, ip.ga, ip.labor_date, ip.anc_complete
    FROM ipt i
    JOIN ipt_pregnancy ip ON i.an = ip.an
    WHERE i.dchdate IS NULL
    ORDER BY i.regdate DESC`,
};

// Pregnancy vital signs for a specific admission (partogram + vitals data)
export const PREGNANCY_VITAL_SIGNS: SqlQueryTemplate = {
  postgresql: `
    SELECT pvs.an, pvs.hr, pvs.bps, pvs.bpd,
           pvs.fetal_heart_sound, pvs.cervical_open_size,
           pvs.eff, pvs.station, pvs.hct, pvs.height, pvs.bw,
           pvs.temperature, pvs.rr, pvs.ultrasound_result
    FROM ipt_pregnancy_vital_sign pvs
    WHERE pvs.an = $1`,
  mysql: `
    SELECT pvs.an, pvs.hr, pvs.bps, pvs.bpd,
           pvs.fetal_heart_sound, pvs.cervical_open_size,
           pvs.eff, pvs.station, pvs.hct, pvs.height, pvs.bw,
           pvs.temperature, pvs.rr, pvs.ultrasound_result
    FROM ipt_pregnancy_vital_sign pvs
    WHERE pvs.an = ?`,
};

// Patient demographics
export const PATIENT_DEMOGRAPHICS: SqlQueryTemplate = {
  postgresql: `
    SELECT p.hn, p.pname, p.fname, p.lname, p.cid, p.birthday, p.sex
    FROM patient p
    WHERE p.hn = $1`,
  mysql: `
    SELECT p.hn, p.pname, p.fname, p.lname, p.cid, p.birthday, p.sex
    FROM patient p
    WHERE p.hn = ?`,
};

// Labor record for an admission
export const LABOR_RECORD: SqlQueryTemplate = {
  postgresql: `
    SELECT l.laborid, l.an, l.mother_gvalue, l.mother_hct,
           l.mother_aging, l.mother_lmp_date, l.mother_edc_date,
           l.labour_startdate, l.labour_starttime,
           l.labour_finishdate, l.labour_finishtime,
           l.placenta_bloodloss, l.infant_weight, l.infant_sex
    FROM labor l
    WHERE l.an = $1`,
  mysql: `
    SELECT l.laborid, l.an, l.mother_gvalue, l.mother_hct,
           l.mother_aging, l.mother_lmp_date, l.mother_edc_date,
           l.labour_startdate, l.labour_starttime,
           l.labour_finishdate, l.labour_finishtime,
           l.placenta_bloodloss, l.infant_weight, l.infant_sex
    FROM labor l
    WHERE l.an = ?`,
};

// ANC data for a patient
export const ANC_DATA: SqlQueryTemplate = {
  postgresql: `
    SELECT pa.person_anc_id, pa.person_id,
           pa.blood_hct_result, pa.ga, pa.lmp, pa.edc,
           pa.preg_no, pa.service_count
    FROM person_anc pa
    WHERE pa.person_id = (
      SELECT p.person_id FROM patient p WHERE p.hn = $1 LIMIT 1
    )
    ORDER BY pa.person_anc_id DESC
    LIMIT 1`,
  mysql: `
    SELECT pa.person_anc_id, pa.person_id,
           pa.blood_hct_result, pa.ga, pa.lmp, pa.edc,
           pa.preg_no, pa.service_count
    FROM person_anc pa
    WHERE pa.person_id = (
      SELECT p.person_id FROM patient p WHERE p.hn = ? LIMIT 1
    )
    ORDER BY pa.person_anc_id DESC
    LIMIT 1`,
};

// Physical examination data (height, weight)
export const OPDSCREEN_DATA: SqlQueryTemplate = {
  postgresql: `
    SELECT os.hn, os.height, os.weight
    FROM opdscreen os
    WHERE os.hn = $1
    ORDER BY os.vstdate DESC
    LIMIT 1`,
  mysql: `
    SELECT os.hn, os.height, os.weight
    FROM opdscreen os
    WHERE os.hn = ?
    ORDER BY os.vstdate DESC
    LIMIT 1`,
};

// Database version check (used by admin test-connection)
export const DATABASE_VERSION: SqlQueryTemplate = {
  postgresql: `SELECT version()`,
  mysql: `SELECT version()`,
};

// Check if key tables exist
export const CHECK_TABLES: SqlQueryTemplate = {
  postgresql: `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('ipt', 'ipt_pregnancy', 'ipt_pregnancy_vital_sign', 'labor', 'patient')`,
  mysql: `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN ('ipt', 'ipt_pregnancy', 'ipt_pregnancy_vital_sign', 'labor', 'patient')`,
};
