import type { Metadata, Viewport } from 'next';
import './globals.css';
import { HydrateProvider } from '@/components/providers/hydrate-provider';

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
    <html lang="en" className="dark">
      <body className="font-sans antialiased min-h-screen">
        <HydrateProvider>{children}</HydrateProvider>
      </body>
    </html>
  );
}
