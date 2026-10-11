// Hospital route group layout — wraps the maternity-ward kiosk in
// SessionProvider (NextAuth) + BmsSessionProvider (BMS tunnel session) plus
// the shared AppShell. Auth gating is handled by middleware.ts (redirect to
// /login?callbackUrl=…&bms-session-id=…), so this layout doesn't perform its
// own session check.
import { SessionProvider } from 'next-auth/react';
import { BmsSessionProvider } from '@/contexts/BmsSessionContext';
import { CallProvider } from '@/components/calls/CallProvider';
import { AppShell } from '@/components/layout/AppShell';
import { BreadcrumbProvider } from '@/components/layout/BreadcrumbContext';
import { ClinicalChatPanel } from '@/components/chat/ClinicalChatPanel';

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BmsSessionProvider>
        <CallProvider>
          <BreadcrumbProvider>
            <AppShell variant="hospital">
              <main className="flex-1">{children}</main>
            </AppShell>
            {/* Clinical chatbot — maternity-ward mode (per-patient clinical RAG). */}
            <ClinicalChatPanel mode="clinical" />
          </BreadcrumbProvider>
        </CallProvider>
      </BmsSessionProvider>
    </SessionProvider>
  );
}
