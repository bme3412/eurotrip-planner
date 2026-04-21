/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 1.5s ease-out',
        'slide-up': 'slideUp 1s ease-out forwards',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'route-draw': 'routeDraw 1.5s ease-out forwards',
      },
      scale: {
        '102': '1.02',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        routeDraw: {
          '0%': { strokeDashoffset: '100%' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        hero: ['var(--font-hero)', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(0,0,0,0.15)',
      },
      // Hero V2 design tokens - isolated to avoid polluting global theme
      colors: {
        hero: {
          ink: '#1e293b',         // slate-800 - primary text
          'ink-muted': '#64748b', // slate-500 - secondary text
          paper: '#f8fafc',       // slate-50 - background
          accent: '#3b82f6',      // blue-500 - primary action
          'accent-soft': '#eff6ff', // blue-50 - accent background
          'accent-hover': '#2563eb', // blue-600 - hover state
          line: '#e2e8f0',        // slate-200 - borders
          success: '#22c55e',     // green-500 - positive indicators
          warning: '#f59e0b',     // amber-500 - warning indicators
        },
      },
    },
  },
  plugins: [],
}

export default config