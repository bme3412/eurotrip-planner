import { DM_Sans, EB_Garamond } from 'next/font/google';

export const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const ebGaramond = EB_Garamond({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

