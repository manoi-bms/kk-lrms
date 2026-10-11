// Shown when auto-provisioning HOSxP's webhook_setting failed on first
// onboarding: what failed, the server's error, and what to do.
'use client';

import { AlertTriangle } from 'lucide-react';

export function OnboardingWebhookAlert({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger-tint px-4 py-3 text-body text-ink">
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-danger-text">ไม่สามารถอัปเดต webhook_setting บน HOSxP</p>
        <p className="break-words text-caption text-ink-muted">{error}</p>
        <p className="text-caption text-ink-muted">
          วิธีแก้: เปิด KK-LRMS จากเมนูใน HOSxP อีกครั้ง หากยังไม่หาย แจ้งผู้ดูแลระบบพร้อมข้อความด้านบน
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg border border-border bg-surface-card px-3 py-1 text-label text-ink-muted hover:bg-brand-soft"
      >
        ซ่อน
      </button>
    </div>
  );
}
