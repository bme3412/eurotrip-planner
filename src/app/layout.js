import './globals.css';
import { Analytics } from "@vercel/analytics/next"
import Providers from './Providers';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import { dmSans, ebGaramond } from './fonts';

export const metadata = {
  metadataBase: new URL('https://eurotrip-planner.vercel.app'),
  title: {
    default: 'EuroTrip Planner — Discover Europe Your Way',
    template: '%s | EuroTrip Planner',
  },
  description: 'Plan your perfect European trip with personalized city recommendations and detailed guides for 220+ destinations.',
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'EuroTrip',
    statusBarStyle: 'default',
  },
  openGraph: {
    siteName: 'EuroTrip Planner',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// viewportFit: 'cover' lets the app draw under the iPhone notch/home bar —
// paired with the env(safe-area-inset-*) padding in globals.css.
export const viewport = {
  themeColor: '#1e63e9',
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${ebGaramond.variable}`}>
      <head>
        <link rel="preconnect" href="https://dknnqxb2tbc80.cloudfront.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://dknnqxb2tbc80.cloudfront.net" />
      </head>
      <body className="antialiased bg-white text-gray-900">
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}