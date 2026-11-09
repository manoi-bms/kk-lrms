/**
 * ANC laboratory canon: what each test is and how HOSxP names and writes it.
 *
 * Hospitals edit `anc_lab` themselves, so ids and codes differ per site and
 * `anc_lab_code` is unreliable (HB means Hepatitis B at some). Only names and
 * value shape are used. To support a newly seen spelling or result form, add
 * a row here; the logic in src/services/anc-lab-classifier.ts stays unchanged.
 */
import {
  HB_G_DL_PLAUSIBLE_MAX,
  HCT_PCT_PLAUSIBLE_MAX,
  HCT_PCT_PLAUSIBLE_MIN,
} from './lab-plausibility';

export type AncLabTest =
  | 'HCT'
  | 'HB'
  | 'HBSAG'
  | 'VDRL_RPR'
  | 'TREPONEMAL'
  | 'SYPHILIS_UNSPECIFIED'
  | 'HIV'
  | 'DCIP'
  | 'OF'
  | 'HB_TYPING'
  | 'MCV'
  | 'MCH'
  | 'BLOOD_GROUP'
  | 'RH'
  | 'GST'
  | 'OGTT_FASTING'
  | 'OGTT_1H'
  | 'OGTT_2H'
  | 'OGTT_3H'
  | 'OGTT_UNSPECIFIED'
  | 'CD4'
  | 'URINE_ALBUMIN'
  | 'URINE_SUGAR';

export type AncLabSource = 'anc_lab' | 'lab_order' | 'person_anc';

export type AncLabInterpretation =
  'negative' | 'positive' | 'abnormal' | 'unknown' | 'missing' | 'concealed';

export type AncLabResultShape =
  | { kind: 'numeric'; min: number; max: number }
  | { kind: 'qualitative' }
  | { kind: 'blood_group' }
  | { kind: 'text' };

export interface AncLabTestDefinition {
  shape: AncLabResultShape;
  /** Outcome never stored in a plaintext column; see cached_anc_lab_results. */
  sensitive?: boolean;
}

const QUALITATIVE: AncLabResultShape = { kind: 'qualitative' };
// Data-quality bounds for plasma glucose, mg/dL; not diagnostic thresholds.
const GLUCOSE: AncLabResultShape = { kind: 'numeric', min: 10, max: 900 };

export const ANC_LAB_TESTS: Record<AncLabTest, AncLabTestDefinition> = {
  HCT: {
    shape: { kind: 'numeric', min: HCT_PCT_PLAUSIBLE_MIN, max: HCT_PCT_PLAUSIBLE_MAX },
  },
  HB: { shape: { kind: 'numeric', min: 0.1, max: HB_G_DL_PLAUSIBLE_MAX } },
  HBSAG: { shape: QUALITATIVE },
  VDRL_RPR: { shape: QUALITATIVE, sensitive: true },
  TREPONEMAL: { shape: QUALITATIVE, sensitive: true },
  SYPHILIS_UNSPECIFIED: { shape: QUALITATIVE, sensitive: true },
  HIV: { shape: QUALITATIVE, sensitive: true },
  DCIP: { shape: QUALITATIVE },
  OF: { shape: QUALITATIVE },
  HB_TYPING: { shape: { kind: 'text' } },
  MCV: { shape: { kind: 'numeric', min: 40, max: 140 } },
  MCH: { shape: { kind: 'numeric', min: 10, max: 50 } },
  BLOOD_GROUP: { shape: { kind: 'blood_group' } },
  RH: { shape: QUALITATIVE },
  GST: { shape: GLUCOSE },
  OGTT_FASTING: { shape: GLUCOSE },
  OGTT_1H: { shape: GLUCOSE },
  OGTT_2H: { shape: GLUCOSE },
  OGTT_3H: { shape: GLUCOSE },
  OGTT_UNSPECIFIED: { shape: GLUCOSE },
  CD4: { shape: { kind: 'numeric', min: 0, max: 5000 }, sensitive: true },
  URINE_ALBUMIN: { shape: QUALITATIVE },
  URINE_SUGAR: { shape: QUALITATIVE },
};

export interface AncLabNameRule {
  /** Matched against the normalised name (lower case, no [ปิด]/numbering prefix). */
  pattern: RegExp;
  /** null = a known look-alike that must stay unclassified. */
  test: AncLabTest | null;
  /** Only rows from these sources may match. */
  sources?: readonly AncLabSource[];
  /** The normalised ANC catalogue name must also match. */
  requireAncLabName?: RegExp;
}

/** First match wins, so look-alikes come before the tests they resemble. */
export const ANC_LAB_NAME_RULES: readonly AncLabNameRule[] = [
  // Look-alikes.
  { pattern: /^hct\s*\(grade\)/, test: null }, // 11001: a grade, not a percent
  { pattern: /^hb\s*a1c|^hba1c/, test: null },
  { pattern: /^hbe\b|^hbeag/, test: null },
  { pattern: /^cbc\s*\(automation\)|^cbc$/, test: null }, // panel header, no value
  { pattern: /hiv.*(viral|\bvl\b|rna)/, test: null },

  { pattern: /\bhb\s*typing\b|^hemoglobin\s*typing/, test: 'HB_TYPING' },
  { pattern: /^hbs\s*ag\b|^hbsag\b/, test: 'HBSAG' },
  {
    pattern: /^(cbc\s*:\s*)?(hb|hgb|hemoglobin|haemoglobin)(\s*\(hgb\))?$/,
    test: 'HB',
    // No ANC catalogue has hemoglobin, and "HB" there can mean Hepatitis B.
    sources: ['lab_order'],
  },
  {
    pattern: /^(cbc\s*:\s*)?(hct|hematocrit|haematocrit)(\s*\(hct\))?(\s*anc)?(\s*\d+)?$/,
    test: 'HCT',
  },
  { pattern: /\bvdrl\b|\brpr\b/, test: 'VDRL_RPR' },
  { pattern: /treponema|\btpha\b/, test: 'TREPONEMAL' },
  { pattern: /^syphilis/, test: 'SYPHILIS_UNSPECIFIED' },
  { pattern: /hiv/, test: 'HIV' },
  { pattern: /^dcip\b/, test: 'DCIP' },
  { pattern: /^of(\s+test)?$/, test: 'OF' },
  { pattern: /^(cbc\s*:\s*)?mcv$/, test: 'MCV' },
  { pattern: /^(cbc\s*:\s*)?mch$/, test: 'MCH' },
  { pattern: /^blood\s*group|^abo\b/, test: 'BLOOD_GROUP' },
  { pattern: /^rh\b/, test: 'RH' },
  { pattern: /^gst\b/, test: 'GST' },
  { pattern: /^(ogtt|fbs).*ก่อน/, test: 'OGTT_FASTING' },
  { pattern: /^ogtt.*\b1\s*(hr|hour|ชม)/, test: 'OGTT_1H' },
  { pattern: /^ogtt.*\b2\s*(hr|hour|ชม)/, test: 'OGTT_2H' },
  { pattern: /^ogtt.*\b3\s*(hr|hour|ชม)/, test: 'OGTT_3H' },
  { pattern: /^ogtt/, test: 'OGTT_UNSPECIFIED' },
  // DTX n numbers the sample, not the hour, so the time point stays unknown.
  { pattern: /^dtx\s*\d+$/, test: 'OGTT_UNSPECIFIED', requireAncLabName: /ogtt/ },
  { pattern: /^cd4\b/, test: 'CD4' },
  { pattern: /^urine\s*albumin/, test: 'URINE_ALBUMIN' },
  { pattern: /^urine\s*sugar/, test: 'URINE_SUGAR' },
];

/**
 * person_anc thalassemia columns, pulled as visible but never classified: they
 * are char(1) flags or lookup ids whose meaning is unconfirmed, so "N" here
 * must not read as a negative result. Columns from the HOSxP data dictionary.
 */
export const ANC_THALASSEMIA_FIELDS: readonly { column: string; label: string }[] = [
  { column: 'thalasseima_wife_of_result', label: 'Thalassemia: OF (ภรรยา)' },
  { column: 'thalasseima_wife_dcip_result', label: 'Thalassemia: DCIP (ภรรยา)' },
  { column: 'thalasseima_wife_hbtyping_result', label: 'Thalassemia: Hb typing (ภรรยา)' },
  { column: 'thalasseima_wife_alpha1_result', label: 'Thalassemia: Alpha-1 (ภรรยา)' },
  { column: 'thalasseima_husband_of_result', label: 'Thalassemia: OF (สามี)' },
  { column: 'thalasseima_husband_dcip_result', label: 'Thalassemia: DCIP (สามี)' },
  { column: 'thalasseima_husband_hbtyping_result', label: 'Thalassemia: Hb typing (สามี)' },
  { column: 'thalasseima_husband_alpha1_result', label: 'Thalassemia: Alpha-1 (สามี)' },
  { column: 'thalassaemia_result_id', label: 'Thalassemia: รหัสผลตรวจ (ภรรยา)' },
  { column: 'husban_thalassaemia_result_id', label: 'Thalassemia: รหัสผลตรวจ (สามี)' },
];

/** Exact (trimmed) text meaning no result was recorded. */
export const MISSING_RESULT_FORMS: readonly RegExp[] = [/^$/, /^null$/i];

/** HOSxP's concealed marker: store no value and never infer one. */
export const CONCEALED_RESULT_FORMS: readonly RegExp[] = [/^ปกปิด$/];

/** Could be negative or a placeholder, so it is never read as either. */
export const AMBIGUOUS_RESULT_FORMS: readonly RegExp[] = [/^-$/];

/** Anything not listed here stays 'unknown'. */
export const QUALITATIVE_RESULT_FORMS: readonly {
  pattern: RegExp;
  interpretation: Extract<AncLabInterpretation, 'negative' | 'positive' | 'abnormal'>;
}[] = [
  { pattern: /^(neg|negative|nr|n|ne|ปกติ)$/i, interpretation: 'negative' },
  { pattern: /^non[- ]?react/i, interpretation: 'negative' },
  { pattern: /^(pos|positive|possitive|\+)$/i, interpretation: 'positive' },
  { pattern: /^ผิดปกติ$/, interpretation: 'abnormal' },
];

/**
 * Hospital-side pre-filter for lab_order, which holds every lab a woman ever
 * had. LOWER(lab_items_name) LIKE terms; deliberately loose because the
 * classifier makes the final call. Interpolated into SQL, so constants only.
 */
export const ANC_LAB_ORDER_SQL_LIKE_TERMS: readonly string[] = [
  'hb%',
  '%hb typing%',
  'hgb%',
  'hemoglobin%',
  'haemoglobin%',
  'cbc:hb%',
  'cbc:hgb%',
  'cbc:hct%',
  'cbc:mcv%',
  'cbc:mch%',
  'hct%',
  'hematocrit%',
  'haematocrit%',
  'mcv%',
  'mch%',
  'vdrl%',
  '%rpr%',
  '%treponema%',
  '%syphilis%',
  '%hiv%',
  'dcip%',
  'of%',
  '%of test%',
  'blood group%',
  'abo%',
  'rh%',
  'gst%',
  'ogtt%',
  'fbs%',
  'dtx%',
  'cd4%',
  'urine albumin%',
  'urine sugar%',
];
