// T085: Auth utility functions — separated from NextAuth config for testability
import { UserRole } from '@/types/domain';

export function mapPositionToRole(position: string): UserRole {
  const lower = position.toLowerCase();
  if (lower.includes('director') || lower.includes('ผู้อำนวยการ')) {
    return UserRole.ADMIN;
  }
  if (lower.includes('doctor') || lower.includes('แพทย์') || lower.includes('สูติ')) {
    return UserRole.OBSTETRICIAN;
  }
  return UserRole.NURSE;
}

export interface BmsUserIdentity {
  name: string;
  role: UserRole;
  hospitalCode: string;
  jwt: string;
  expiresAt: string;
}

export async function validateBmsSession(
  sessionId: string,
  tunnelUrl: string,
): Promise<BmsUserIdentity | null> {
  // Dev auth bypass — accept any session ID as admin
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    console.log(`[AUTH] Dev bypass: session "${sessionId}" → ADMIN`);
    return {
      name: 'Dev Admin (ผู้ดูแลระบบ)',
      role: UserRole.ADMIN,
      hospitalCode: '10670',
      jwt: 'dev-jwt-token',
      expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
    };
  }

  try {
    const validateUrl = process.env.BMS_VALIDATE_URL ?? 'https://hosxp.net/phapi/PasteJSON';

    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        tunnel_url: tunnelUrl,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();

    return {
      name: data.user?.name ?? 'Unknown',
      role: mapPositionToRole(data.user?.position ?? ''),
      hospitalCode: data.user?.hospital_code ?? '',
      jwt: data.jwt ?? '',
      expiresAt: data.expires_at ?? '',
    };
  } catch {
    return null;
  }
}
