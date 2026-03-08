// T044: Root layout — Noto Sans Thai, SWR provider, Thai locale, TooltipProvider
import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SWRProvider } from './swr-provider';
import './globals.css';

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  variable: '--font-noto-sans-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KK-LRMS — ระบบติดตามการคลอดจังหวัดขอนแก่น',
  description: 'ระบบติดตามการคลอดแบบรวมศูนย์ จังหวัดขอนแก่น (Khon Kaen Labor Room Monitoring System)',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${notoSansThai.variable} font-sans antialiased`}>
        <SWRProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
