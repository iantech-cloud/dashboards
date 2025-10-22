import localFont from 'next/font/local';
import { NextFont } from 'next/font/local';

// Export Inter font as local font (your existing setup)
export const inter = localFont({
  src: [
    {
      path: './fonts/Inter-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Inter-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/Inter-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/Inter-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-inter',
  display: 'swap',
});

// Export Times New Roman as system font (using CSS variables approach)
export const timesNewRoman: NextFont = {
  className: 'font-times-new-roman',
  variable: '--font-times-new-roman',
  style: {
    fontFamily: 'Times New Roman, Times, serif',
  },
} as NextFont;
