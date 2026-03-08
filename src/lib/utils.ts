// T037: General utilities + shadcn cn()
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RiskLevel, type HospitalLevel } from '@/types/domain';
import { RISK_LEVELS } from '@/config/risk-levels';
import { HOSPITAL_LEVELS } from '@/config/hospitals';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export function formatThaiDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543; // Buddhist Era
  return `${day} ${month} ${year}`;
}

export function formatThaiTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export function calculateAge(birthday: Date | string): number {
  const birth = typeof birthday === 'string' ? new Date(birthday) : birthday;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function riskLevelToColor(level: RiskLevel): string {
  return RISK_LEVELS[level].color;
}

export function riskLevelToBgColor(level: RiskLevel): string {
  return RISK_LEVELS[level].bgColor;
}

export function riskLevelToThaiLabel(level: RiskLevel): string {
  return RISK_LEVELS[level].labelTh;
}

export function formatHospitalLevel(level: HospitalLevel): string {
  return HOSPITAL_LEVELS[level]?.nameTh ?? String(level);
}

export function truncateName(name: string, maxLen: number = 30): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen) + '...';
}
