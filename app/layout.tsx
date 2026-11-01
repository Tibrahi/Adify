import type { Metadata, Viewport } from 'next';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './globals.css';
import { SwRegister } from '@/components/SwRegister';

export const metadata: Metadata = {
  title: {
    default: 'ADIFY — Events and ceremonies across Africa',
    template: '%s · ADIFY',
  },
  description:
    'Discover public events and meaningful ceremonies across Africa. Search, reserve your spot, or publish your own gathering.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ADIFY' },
};

export const viewport: Viewport = {
  themeColor: '#247A45',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-adify-bg text-adify-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-adify-action focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
