'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { DashboardHospital } from '@/types/api';

interface InactiveHospitalListProps {
  hospitals: DashboardHospital[];
}

export function InactiveHospitalList({ hospitals }: InactiveHospitalListProps) {
  const [expanded, setExpanded] = useState(true);
  const router = useRouter();

  if (hospitals.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <span>โรงพยาบาลอื่นๆ ({hospitals.length} แห่ง)</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {hospitals.map((h) => (
            <button
              key={h.hcode}
              type="button"
              onClick={() => router.push(`/hospitals/${h.hcode}`)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
            >
              <span className="truncate">
                {h.name} ({h.level})
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-gray-400" aria-hidden="true" />
                <span className="text-xs">ไม่ทราบ</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
