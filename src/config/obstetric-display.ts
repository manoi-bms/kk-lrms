// src/config/obstetric-display.ts
// Thai obstetric wording shared by the ward board and the patient page. Words
// only: each component keeps its own cut-offs. Three cut-off sets exist today,
// and that is a clinical ruling, recorded under the spec's Out of scope.
export const LABOUR_PHASE_LABEL_TH = {
  latent: 'ระยะแฝง',
  active: 'ระยะเร่ง',
  transition: 'ระยะเปลี่ยนผ่าน',
} as const;
