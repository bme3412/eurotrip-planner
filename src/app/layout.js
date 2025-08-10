import './globals.css';
import { Analytics } from "@vercel/analytics/next"
import Providers from './Providers';

export const metadata = {
  title: "Euro-Trip | Minimal Planner",
  description: "Enter your dates. Get Europe’s best for that moment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}