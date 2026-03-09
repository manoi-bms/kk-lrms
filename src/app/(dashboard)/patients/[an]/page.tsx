'use client';

import { use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePatient } from '@/hooks/usePatient';
import { usePartogram } from '@/hooks/usePartogram';
import { useSSE } from '@/hooks/useSSE';
import { useSetBreadcrumbs } from '@/components/layout/BreadcrumbContext';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { ReferralBanner } from '@/components/patient/ReferralBanner';
import { StickyPatientHeader } from '@/components/patient/StickyPatientHeader';
import { ClinicalData } from '@/components/patient/ClinicalData';
import { ContractionTable } from '@/components/patient/ContractionTable';
import { PrintForm } from '@/components/patient/PrintForm';
import { HighRiskAlert } from '@/components/shared/HighRiskAlert';
import { LoadingState } from '@/components/shared/LoadingState';
import { VitalSignGauge } from '@/components/charts/VitalSignGauge';
import { BpBarChart } from '@/components/charts/BpBarChart';
import { VitalTrendCharts } from '@/components/charts/VitalTrendCharts';
import { PartogramChart } from '@/components/charts/PartogramChart';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Printer } from 'lucide-react';
import { RiskLevel } from '@/types/domain';
import { RISK_LEVELS } from '@/config/risk-levels';

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ an: string }>;
}) {
  const { an } = use(params);
  const router = useRouter();
  const mainHeaderRef = useRef<HTMLDivElement>(null);

  const { patient, cpdScore, vitals, contractions, isLoading, mutate } = usePatient(an);
  const { partogram } = usePartogram(an);

  useSetBreadcrumbs([
    { label: 'แดชบอร์ด', href: '/' },
    { label: patient?.name ?? `AN ${an}` },
  ]);

  useSSE({
    onPatientUpdate: () => mutate(),
    onSyncComplete: () => mutate(),
  });

  if (isLoading) {
    return <LoadingState message="กำลังโหลดข้อมูลผู้คลอด..." />;
  }

  if (!patient) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-400">ไม่พบข้อมูลผู้คลอด</p>
          <button onClick={() => router.back()} className="mt-2 text-sm text-teal-600 underline">
            กลับ
          </button>
        </div>
      </div>
    );
  }

  const latestVital = vitals.length > 0 ? vitals[vitals.length - 1] : null;
  const hrHistory = vitals.map((v) => v.maternalHr).filter((v): v is number => v !== null);
  const fhrHistory = vitals.map((v) => (v.fetalHr ? parseInt(v.fetalHr) : null)).filter((v): v is number => v !== null);

  return (
    <div className="space-y-5">
      {cpdScore && cpdScore.score >= 10 && (
        <HighRiskAlert score={cpdScore.score} an={patient.an} patientName={patient.name} />
      )}

      <StickyPatientHeader
        name={patient.name}
        an={patient.an}
        laborStatus={patient.laborStatus}
        hospitalName={patient.hospital.name}
        cpdScore={cpdScore ? { score: cpdScore.score, riskLevel: cpdScore.riskLevel as RiskLevel } : null}
        mainHeaderRef={mainHeaderRef}
      />

      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 print:hidden"
      >
        <ArrowLeft size={16} /> กลับ
      </button>

      <div ref={mainHeaderRef}>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <PatientHeader
            hn={patient.hn}
            an={patient.an}
            name={patient.name}
            age={patient.age}
            admitDate={patient.admitDate}
            laborStatus={patient.laborStatus}
            hospital={patient.hospital}
            cpdScore={cpdScore ? { score: cpdScore.score, riskLevel: cpdScore.riskLevel as RiskLevel } : null}
          />
        </div>
      </div>

      {cpdScore && cpdScore.riskLevel !== RiskLevel.LOW && (
        <ReferralBanner
          score={cpdScore.score}
          riskLevel={cpdScore.riskLevel as RiskLevel}
          recommendation={cpdScore.recommendation ?? RISK_LEVELS[cpdScore.riskLevel as RiskLevel].action}
        />
      )}

      <ClinicalData
        gravida={patient.gravida}
        gaWeeks={patient.gaWeeks}
        ancCount={patient.ancCount}
        heightCm={patient.heightCm}
        weightDiffKg={patient.weightDiffKg}
        fundalHeightCm={patient.fundalHeightCm}
        usWeightG={patient.usWeightG}
        hematocritPct={patient.hematocritPct}
      />

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-medium text-slate-700">สัญญาณชีพล่าสุด</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <VitalSignGauge label="Maternal HR" value={latestVital?.maternalHr ?? null} unit="bpm" min={40} max={160} normalMin={60} normalMax={100} history={hrHistory} />
          <VitalSignGauge label="Fetal HR" value={latestVital?.fetalHr ? parseInt(latestVital.fetalHr) : null} unit="bpm" min={80} max={200} normalMin={110} normalMax={160} history={fhrHistory} />
          <VitalSignGauge label="BP (SBP)" value={latestVital?.sbp ?? null} unit="mmHg" min={60} max={200} normalMin={90} normalMax={140} />
          <VitalSignGauge label="PPH" value={latestVital?.pphAmountMl ?? null} unit="ml" min={0} max={1000} normalMin={0} normalMax={500} />
        </div>
      </div>

      {vitals.length > 0 && (
        <div>
          <h3 className="mb-3 text-base font-medium text-slate-700">แนวโน้มสัญญาณชีพ</h3>
          <VitalTrendCharts vitals={vitals} />
        </div>
      )}

      {partogram && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <PartogramChart entries={partogram.entries} startTime={partogram.startTime} />
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <BpBarChart vitals={vitals} />
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <ContractionTable contractions={contractions} />
      </div>

      <div className="flex justify-end print:hidden">
        <Dialog>
          <DialogTrigger render={
            <Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50" />
          }>
            <Printer size={16} className="mr-2" />
            พิมพ์บันทึกการคลอด
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <PrintForm patient={patient} hospitalName={patient.hospital.name} vitals={vitals} />
            <div className="flex justify-end gap-2">
              <Button onClick={() => window.print()}>พิมพ์</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
