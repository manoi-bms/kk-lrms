// T011: HOSxP source row types — matching actual HOSxP column names

export interface HosxpPatientRow {
  hn: string;
  pname: string;
  fname: string;
  lname: string;
  cid: string;
  birthday: string;
  sex: string;
}

export interface HosxpIptRow {
  an: string;
  hn: string;
  regdate: string;
  regtime: string;
  dchdate: string | null;
  dchtime: string | null;
  ward: string;
  admdoctor: string;
}

export interface HosxpPregnancyRow {
  an: string;
  preg_number: number | null;
  ga: number | null;
  labor_date: string | null;
  anc_complete: string | null;
  child_count: number | null;
  deliver_type: number | null;
}

export interface HosxpVitalSignRow {
  an: string;
  hr: number | null;
  bps: number | null;
  bpd: number | null;
  fetal_heart_sound: string | null;
  cervical_open_size: number | null;
  eff: number | null;
  station: string | null;
  hct: number | null;
  height: number | null;
  bw: number | null;
  temperature: number | null;
  rr: number | null;
  ultrasound_result: string | null;
}

export interface HosxpLaborRow {
  laborid: number;
  an: string;
  mother_gvalue: string | null;
  mother_hct: string | null;
  mother_aging: number | null;
  mother_lmp_date: string | null;
  mother_edc_date: string | null;
  labour_startdate: string | null;
  labour_starttime: string | null;
  labour_finishdate: string | null;
  labour_finishtime: string | null;
  placenta_bloodloss: number | null;
  infant_weight: number | null;
  infant_sex: string | null;
}

export interface HosxpAncRow {
  person_anc_id: number;
  person_id: number;
  blood_hct_result: string | null;
  ga: number | null;
  lmp: string | null;
  edc: string | null;
  preg_no: number | null;
  service_count: number | null;
}

export interface HosxpOpdscreenRow {
  hn: string;
  height: number | null;
  weight: number | null;
}
