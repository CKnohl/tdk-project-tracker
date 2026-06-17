import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { SplashScreen } from '@/components/pwa/splash-screen';

const APP_NAME = 'TDK Project Tracker';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  applicationName: APP_NAME,
  title: { default: `${APP_NAME} — TDK / M&P`, template: `%s · ${APP_NAME}` },
  description: 'Engineering operations platform for TDK Engineering and M&P Engineers.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: APP_NAME },
  formatDetection: { telephone: false },
  // Favicon + Apple touch icon are auto-detected from app/icon.png and
  // app/apple-icon.png (Next.js file conventions).
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
        <SplashScreen />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
