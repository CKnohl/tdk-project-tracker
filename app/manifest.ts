import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TDK Project Tracker',
    short_name: 'TDK Tracker',
    description: 'Engineering operations platform for TDK Engineering and M&P Engineers.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    icons: [
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
