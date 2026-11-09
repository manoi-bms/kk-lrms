/**
 * Turns one HOSxP lab row into a canonical test and a normalised result.
 *
 * Pure and dependency-light because it runs in the browser (to pre-filter lab
 * orders) as well as on the server. Rules live in src/config/anc-lab-canon.ts.
 *
 * A name alone can lie (11011 maps "Anti HIV" to hematocrit-shaped numbers),
 * so a value that contradicts its test leaves the row unclassified. Unknown
 * forms stay unknown: nothing here guesses a result.
 */
import {
  AMBIGUOUS_RESULT_FORMS,
  ANC_LAB_NAME_RULES,
  ANC_LAB_TESTS,
  CONCEALED_RESULT_FORMS,
  MISSING_RESULT_FORMS,
  QUALITATIVE_RESULT_FORMS,
  type AncLabInterpretation,
  type AncLabResultShape,
  type AncLabSource,
  type AncLabTest,
  type QualitativeResultForm,
} from '@/config/anc-lab-canon';

export interface AncLabClassifierInput {
  source: AncLabSource;
  ancLabName: string | null;
  labItemsName: string | null;
  result: string | null;
}

/** One HOSxP lab row as the browser pushes it; raw and unclassified. */
export interface AncLabPayloadRow {
  source: AncLabSource;
  /** HOSxP row identity, stable across pulls. */
  sourceId: string;
  resultDate?: string | null;
  gaWeeks?: number | null;
  ancLabName?: string | null;
  labItemsName?: string | null;
  labItemsCode?: string | null;
  result?: string | null;
  unit?: string | null;
  normalReference?: string | null;
  abnormalFlag?: string | null;
  ancResultNormalRaw?: string | null;
}

export type AncLabClassificationNote = 'no_rule' | 'excluded_by_rule' | 'value_shape_mismatch';

export interface AncLabClassification {
  canonicalTest: AncLabTest | null;
  classificationNote: AncLabClassificationNote | null;
  /** Original text, or null when missing or concealed. */
  rawResult: string | null;
  numericValue: number | null;
  normalizedValue: string | null;
  interpretation: AncLabInterpretation | null;
  concealed: boolean;
}

export type AncLabResultReading = Pick<
  AncLabClassification,
  'numericValue' | 'normalizedValue' | 'interpretation'
>;

const BARE_NUMBER = /^\d+(?:[.,]\d+)?\s*%?$/;
// 1,200 is one thousand two hundred, while a decimal comma (36,5) is one digit.
const THOUSANDS_SEPARATED = /^\d{1,3},\d{3}$/;
const BLOOD_GROUP = /^(?:group\s+)?(ab|a|b|o)\s*(?:rh)?\s*([+-])?$/i;

function normaliseName(name: string | null): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/^\[[^\]]*\]\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\s+/g, ' ');
}

function matchesAny(forms: readonly RegExp[], value: string): boolean {
  return forms.some((form) => form.test(value));
}

function matchNameRule(
  input: Pick<AncLabClassifierInput, 'source' | 'ancLabName' | 'labItemsName'>,
) {
  // person_anc columns are flags of unconfirmed meaning; see ANC_THALASSEMIA_FIELDS.
  if (input.source === 'person_anc') return null;
  const name = normaliseName(input.labItemsName) || normaliseName(input.ancLabName);
  if (!name) return null;
  const ancLabName = normaliseName(input.ancLabName);
  return (
    ANC_LAB_NAME_RULES.find(
      (rule) =>
        rule.pattern.test(name) &&
        (!rule.sources || rule.sources.includes(input.source)) &&
        (!rule.requireAncLabName || rule.requireAncLabName.test(ancLabName)),
    ) ?? null
  );
}

function parseNumber(value: string): number | null {
  if (!BARE_NUMBER.test(value) || THOUSANDS_SEPARATED.test(value)) return null;
  const n = Number(value.replace('%', '').replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

function qualitativeInterpretation(
  value: string,
  forms: readonly QualitativeResultForm[],
): AncLabInterpretation {
  return forms.find((f) => f.pattern.test(value))?.interpretation ?? 'unknown';
}

/** null = the value contradicts the shape its test requires. */
function readValue(shape: AncLabResultShape, value: string): AncLabResultReading | null {
  const none = { numericValue: null, normalizedValue: null };
  // A test with its own table has already decided what its forms mean.
  const ownForms = shape.kind === 'qualitative' ? shape.forms : undefined;
  if (!ownForms && matchesAny(AMBIGUOUS_RESULT_FORMS, value)) {
    return { ...none, interpretation: 'unknown' };
  }
  switch (shape.kind) {
    case 'numeric': {
      const n = parseNumber(value);
      if (n == null || n < shape.min || n > shape.max) return null;
      return { numericValue: n, normalizedValue: null, interpretation: null };
    }
    case 'qualitative':
      if (BARE_NUMBER.test(value)) return null;
      return {
        ...none,
        interpretation: qualitativeInterpretation(value, ownForms ?? QUALITATIVE_RESULT_FORMS),
      };
    case 'blood_group': {
      const match = BLOOD_GROUP.exec(value);
      if (!match) return null;
      return {
        numericValue: null,
        normalizedValue: `${match[1].toUpperCase()}${match[2] ?? ''}`,
        interpretation: null,
      };
    }
    case 'text':
      return { ...none, interpretation: 'unknown' };
  }
}

export function classifyAncLab(input: AncLabClassifierInput): AncLabClassification {
  const value = (input.result ?? '').trim();
  const concealed = matchesAny(CONCEALED_RESULT_FORMS, value);
  const missing = matchesAny(MISSING_RESULT_FORMS, value);
  const rule = matchNameRule(input);
  const test = rule?.test ?? null;

  const base = {
    numericValue: null,
    normalizedValue: null,
    concealed,
    rawResult: concealed || missing ? null : value,
  };
  const noteWhenUnmatched: AncLabClassificationNote = rule ? 'excluded_by_rule' : 'no_rule';

  if (concealed || missing) {
    return {
      ...base,
      canonicalTest: test,
      classificationNote: test ? null : noteWhenUnmatched,
      interpretation: concealed ? 'concealed' : 'missing',
    };
  }
  if (!test) {
    return {
      ...base,
      canonicalTest: null,
      classificationNote: noteWhenUnmatched,
      interpretation: 'unknown',
    };
  }
  const reading = readValue(ANC_LAB_TESTS[test].shape, value);
  if (!reading) {
    return {
      ...base,
      canonicalTest: null,
      classificationNote: 'value_shape_mismatch',
      interpretation: 'unknown',
    };
  }
  return { ...base, ...reading, canonicalTest: test, classificationNote: null };
}

/** Whether a lab_order item is one the app wants; its value is judged later. */
export function isClassifiableLabOrderName(labItemsName: string): boolean {
  return matchNameRule({ source: 'lab_order', ancLabName: null, labItemsName })?.test != null;
}

/** Re-derives what a sensitive test keeps out of its plaintext columns. */
export function interpretStoredResult(test: AncLabTest, rawResult: string): AncLabResultReading {
  return (
    readValue(ANC_LAB_TESTS[test].shape, rawResult.trim()) ?? {
      numericValue: null,
      normalizedValue: null,
      interpretation: 'unknown',
    }
  );
}
