import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';

const APP_NAME = 'TDK Project Tracker';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  applicationName: APP_NAME,
  title: { default: `${APP_NAME} — TDK / M&P Engineering`, template: `%s · ${APP_NAME}` },
  description: 'Engineering operations platform for TDK Engineering and M&P Engineers.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: APP_NAME },
  formatDetection: { telephone: false },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
