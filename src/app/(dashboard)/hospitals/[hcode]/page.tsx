// T057: Hospital patient list page
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CpdBadge } from '@/components/shared/CpdBadge';
import { LoadingState } from '@/components/shared/LoadingState';
import type { RiskLevel } from '@/types/domain';

interface PatientRow {
  id: string;
  hn: string;
  an: string;
  name: string;
  age: number;
  gravida: number | null;
  ga_weeks: number | null;
  admit_date: string;
  labor_status: string;
  cpd_score: number | null;
  cpd_risk_level: string | null;
}

export default function HospitalPatientListPage({
  params,
}: {
  params: Promise<{ hcode: string }>;
}) {
  const { hcode } = use(params);
  const router = useRouter();

  const { data, isLoading } = useSWR(`/api/hospitals/${hcode}/patients`, {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return <LoadingState message="กำลังโหลดรายชื่อผู้คลอด..." />;
  }

  const patients: PatientRow[] = data?.patients ?? [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← กลับ
        </button>
        <h1 className="text-xl font-bold">รายชื่อผู้คลอด — รหัส {hcode}</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>AN</TableHead>
              <TableHead>HN</TableHead>
              <TableHead>อายุ</TableHead>
              <TableHead>ครรภ์ที่</TableHead>
              <TableHead>GA</TableHead>
              <TableHead>CPD</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่ Admit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  ไม่มีผู้คลอดในขณะนี้
                </TableCell>
              </TableRow>
            ) : (
              patients.map((p) => (
                <TableRow
                  key={p.id || p.an}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/patients/${p.an}`)}
                >
                  <TableCell className="font-medium">{p.an}</TableCell>
                  <TableCell>{p.hn}</TableCell>
                  <TableCell>{p.age} ปี</TableCell>
                  <TableCell>{p.gravida ?? '-'}</TableCell>
                  <TableCell>{p.ga_weeks ? `${p.ga_weeks} สัปดาห์` : '-'}</TableCell>
                  <TableCell>
                    {p.cpd_score != null && p.cpd_risk_level ? (
                      <CpdBadge
                        score={p.cpd_score}
                        riskLevel={p.cpd_risk_level as RiskLevel}
                        size="sm"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.labor_status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {p.labor_status === 'ACTIVE' ? 'คลอดอยู่' : 'คลอดแล้ว'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.admit_date
                      ? new Date(p.admit_date).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
