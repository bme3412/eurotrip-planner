import './globals.css';
import { Analytics } from "@vercel/analytics/next"
import Providers from './Providers';
import { dmSans, ebGaramond } from './fonts';

export const metadata = {
  title: "Eurotrip Planner & City Guides",
  description: "Plan your Eurotrip. Enter dates to see the best cities for that moment. Free to start; Pro unlocks AI itineraries, exports, and saved trips.",
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
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}