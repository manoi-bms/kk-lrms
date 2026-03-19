// T085: NextAuth.js v5 configuration with BMS Session auth
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { UserRole } from '@/types/domain';
import { validateBmsSession } from '@/lib/auth-utils';

export { mapPositionToRole, validateBmsSession } from '@/lib/auth-utils';
export type { BmsUserIdentity } from '@/lib/auth-utils';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'BMS Session',
      credentials: {
        sessionId: { label: 'BMS Session ID', type: 'text' },
      },
      async authorize(credentials) {
        const sessionId = credentials?.sessionId as string;
        if (!sessionId) return null;

        const tunnelUrl = process.env.DEV_HOSPITAL_TUNNEL_URL ?? '';
        const identity = await validateBmsSession(sessionId, tunnelUrl);
        if (!identity) return null;

        return {
          id: sessionId,
          name: identity.name,
          role: identity.role,
          hospitalCode: identity.hospitalCode,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: UserRole }).role;
        token.hospitalCode = (user as unknown as { hospitalCode: string }).hospitalCode;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { role: UserRole }).role = token.role as UserRole;
        (session.user as unknown as { hospitalCode: string }).hospitalCode = token.hospitalCode as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
});
