import type { Config } from 'tailwindcss';

const config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '0%': {
            transform: 'translateX(-100%) skewX(-12deg)',
          },
          '100%': {
            transform: 'translateX(100%) skewX(-12deg)',
          },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
