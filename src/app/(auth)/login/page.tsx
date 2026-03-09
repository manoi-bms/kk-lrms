// T089: Login page — BMS Session ID authentication (split layout)
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Building2, Activity, BarChart3, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      setError('กรุณากรอก BMS Session ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        sessionId: sessionId.trim(),
        redirect: false,
      });

      if (result?.error) {
        setError('Session ID ไม่ถูกต้องหรือหมดอายุ');
      } else {
        router.push('/');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 lg:w-[45%] flex-col justify-between bg-gradient-to-br from-teal-700 to-teal-900 p-10 text-white">
        <div>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-teal-200" />
            <div>
              <h1 className="text-xl font-bold">KK-LRMS</h1>
              <p className="text-sm text-teal-300">ระบบติดตามการคลอดจังหวัดขอนแก่น</p>
            </div>
          </div>
          <p className="mt-1 text-xs text-teal-400">Khon Kaen Labor Room Monitoring System</p>
        </div>

        <div className="space-y-6">
          <p className="text-lg font-medium text-teal-100">
            ติดตามสถานะผู้คลอดทุกโรงพยาบาลในจังหวัดแบบ Real-time
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 shrink-0 text-teal-300" />
              <span className="text-sm text-teal-200">26 โรงพยาบาลในเครือข่าย</span>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 shrink-0 text-teal-300" />
              <span className="text-sm text-teal-200">CPD Score คำนวณอัตโนมัติ</span>
            </div>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 shrink-0 text-teal-300" />
              <span className="text-sm text-teal-200">Partogram ติดตามความก้าวหน้าการคลอด</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-teal-400">
          v1.0.0 — สำนักงานสาธารณสุขจังหวัดขอนแก่น
        </p>
      </div>

      {/* Right Panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile header — shown only on small screens */}
          <div className="flex flex-col items-center gap-3 md:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-slate-800">KK-LRMS</h1>
              <p className="text-sm text-slate-500">ระบบติดตามการคลอดจังหวัดขอนแก่น</p>
            </div>
          </div>

          {/* Desktop header — hidden on mobile */}
          <div className="hidden md:block">
            <h2 className="text-2xl font-bold text-slate-800">เข้าสู่ระบบ</h2>
            <p className="mt-1 text-sm text-slate-500">
              KK-LRMS — ระบบติดตามการคลอด
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="sessionId" className="text-sm font-medium text-slate-700">
                BMS Session ID
              </label>
              <Input
                id="sessionId"
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="กรอก Session ID จาก BMS"
                disabled={loading}
                autoFocus
                className="h-11 focus-visible:ring-teal-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  กำลังตรวจสอบ...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  เข้าสู่ระบบ
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400">
            ระบบตรวจสอบสิทธิ์ผ่าน BMS Session ของ สสจ.ขอนแก่น
          </p>
        </div>
      </div>
    </div>
  );
}
