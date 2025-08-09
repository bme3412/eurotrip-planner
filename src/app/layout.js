import './globals.css';
import { Analytics } from "@vercel/analytics/next"
import Providers from './Providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}