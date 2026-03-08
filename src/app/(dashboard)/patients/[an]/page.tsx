// T082: Patient detail page — full clinical view with charts and print
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { usePatient } from '@/hooks/usePatient';
import { usePartogram } from '@/hooks/usePartogram';
import { useSSE } from '@/hooks/useSSE';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { ClinicalData } from '@/components/patient/ClinicalData';
import { ContractionTable } from '@/components/patient/ContractionTable';
import { PrintForm } from '@/components/patient/PrintForm';
import { HighRiskAlert } from '@/components/shared/HighRiskAlert';
import { LoadingState } from '@/components/shared/LoadingState';
import { VitalSignGauge } from '@/components/charts/VitalSignGauge';
import { BpBarChart } from '@/components/charts/BpBarChart';
import { PartogramChart } from '@/components/charts/PartogramChart';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { RiskLevel } from '@/types/domain';

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ an: string }>;
}) {
  const { an } = use(params);
  const router = useRouter();

  const { patient, cpdScore, vitals, contractions, isLoading, mutate } = usePatient(an);
  const { partogram } = usePartogram(an);

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
          <p className="text-lg text-muted-foreground">ไม่พบข้อมูลผู้คลอด</p>
          <button
            onClick={() => router.back()}
            className="mt-2 text-sm text-primary underline"
          >
            กลับ
          </button>
        </div>
      </div>
    );
  }

  // Latest vital signs for gauges
  const latestVital = vitals.length > 0 ? vitals[vitals.length - 1] : null;
  const hrHistory = vitals.map((v) => v.maternalHr).filter((v): v is number => v !== null);
  const fhrHistory = vitals.map((v) => v.fetalHr ? parseInt(v.fetalHr) : null).filter((v): v is number => v !== null);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* High Risk Alert Dialog */}
      {cpdScore && cpdScore.score >= 10 && (
        <HighRiskAlert
          score={cpdScore.score}
          an={patient.an}
          patientName={patient.name}
        />
      )}

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        ← กลับ
      </button>

      {/* Patient Header */}
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

      {/* Clinical Data */}
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

      {/* Vital Sign Gauges — 2x2 grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <VitalSignGauge
          label="Maternal HR"
          value={latestVital?.maternalHr ?? null}
          unit="bpm"
          min={40}
          max={160}
          normalMin={60}
          normalMax={100}
          history={hrHistory}
        />
        <VitalSignGauge
          label="Fetal HR"
          value={latestVital?.fetalHr ? parseInt(latestVital.fetalHr) : null}
          unit="bpm"
          min={80}
          max={200}
          normalMin={110}
          normalMax={160}
          history={fhrHistory}
        />
        <VitalSignGauge
          label="BP (SBP)"
          value={latestVital?.sbp ?? null}
          unit="mmHg"
          min={60}
          max={200}
          normalMin={90}
          normalMax={140}
        />
        <VitalSignGauge
          label="PPH"
          value={latestVital?.pphAmountMl ?? null}
          unit="ml"
          min={0}
          max={1000}
          normalMin={0}
          normalMax={500}
        />
      </div>

      {/* Partogram */}
      {partogram && (
        <PartogramChart
          entries={partogram.entries}
          startTime={partogram.startTime}
        />
      )}

      {/* BP Chart */}
      <BpBarChart vitals={vitals} />

      {/* Contractions */}
      <ContractionTable contractions={contractions} />

      {/* Print Button */}
      <div className="flex justify-end print:hidden">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            พิมพ์บันทึกการคลอด
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <PrintForm
              patient={patient}
              hospitalName={patient.hospital.name}
              vitals={vitals}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => window.print()}>พิมพ์</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
