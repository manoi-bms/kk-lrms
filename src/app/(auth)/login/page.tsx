// T089: Login page — BMS Session ID authentication (Dark Authority design)
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Building2, Activity, BarChart3, Shield, Clock } from 'lucide-react';
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
      <div className="hidden md:flex md:w-1/2 lg:w-[45%] relative flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white overflow-hidden">
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Content (above overlay) */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">KK-LRMS</h1>
              <p className="text-sm text-slate-400">Khon Kaen Labor Room Monitoring System</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-3xl font-bold text-white leading-tight">
            ระบบติดตาม
            <br />
            การคลอด
            <br />
            จังหวัดขอนแก่น
          </h2>

          <div className="space-y-3">
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
              <Building2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span className="text-sm text-slate-300">26 โรงพยาบาลในเครือข่าย</span>
            </div>
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
              <Activity className="h-5 w-5 shrink-0 text-emerald-400" />
              <span className="text-sm text-slate-300">CPD Score คำนวณอัตโนมัติ</span>
            </div>
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
              <BarChart3 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span className="text-sm text-slate-300">Partogram ติดตามความก้าวหน้าการคลอด</span>
            </div>
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
              <Clock className="h-5 w-5 shrink-0 text-emerald-400" />
              <span className="text-sm text-slate-300">Real-time Dashboard ทุกโรงพยาบาล</span>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          v1.0.0 — สำนักงานสาธารณสุขจังหวัดขอนแก่น
        </p>
      </div>

      {/* Right Panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 md:bg-white px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile header — shown only on small screens */}
          <div className="md:hidden">
            <div className="bg-slate-900 rounded-2xl p-6 mb-8 text-center">
              <div className="flex justify-center mb-3">
                <div className="bg-white/10 rounded-xl p-3">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
              <h1 className="text-lg font-bold text-white">KK-LRMS</h1>
              <p className="text-sm text-slate-400">ระบบติดตามการคลอดจังหวัดขอนแก่น</p>
            </div>
          </div>

          {/* Desktop header — hidden on mobile */}
          <div className="hidden md:block">
            <h2 className="text-3xl font-bold text-slate-900">เข้าสู่ระบบ</h2>
            <p className="mt-2 text-sm text-slate-400">
              ลงชื่อเข้าใช้ด้วย BMS Session ID
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="sessionId"
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
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
                className="h-12 rounded-xl border-slate-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 bg-slate-50 font-mono"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
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
