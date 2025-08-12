import './globals.css';
import { Analytics } from "@vercel/analytics/next"
import Providers from './Providers';
import AuthButton from '../components/common/AuthButton';

export const metadata = {
  title: "Eurotrip Planner & City Guides",
  description: "Plan your Eurotrip. Enter dates to see the best cities for that moment. Free to start; Pro unlocks AI itineraries, exports, and saved trips.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://dknnqxb2tbc80.cloudfront.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://dknnqxb2tbc80.cloudfront.net" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <Providers>
          <div className="mx-auto max-w-6xl px-6 py-4 flex justify-end">
            <AuthButton />
          </div>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}