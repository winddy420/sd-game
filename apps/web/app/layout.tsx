import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { HydrateProvider } from '@/components/providers/hydrate-provider';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { RegisterSW } from '@/components/providers/register-sw';

/** Self-hosted Thai-capable font (paired after the system Latin stack). */
const notoThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SD-GAME — System Design 0→Hero',
  description:
    'Duolingo × LeetCode × SimCity for Software Engineers. Learn system design, networking, DevOps & infra by building real architectures.',
  manifest: '/manifest.webmanifest',
  applicationName: 'SD-GAME',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SD-GAME',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${notoThai.variable}`}>
      <body className="font-sans antialiased min-h-screen">
        <I18nProvider>
          <HydrateProvider>{children}</HydrateProvider>
        </I18nProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
