import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cy:  { DEFAULT: '#00C1D4', dark: '#0098AA', light: '#E0F9FC' },
        mg:  { DEFAULT: '#E8198B', dark: '#B5166E', light: '#FDEEF7' },
        yl:  { DEFAULT: '#F5C800', dark: '#C9A300' },
        grn: { DEFAULT: '#10B981', light: '#ECFDF5' },
        red: { DEFAULT: '#EF4444', light: '#FEF2F2' },
        amb: { DEFAULT: '#F59E0B', light: '#FFFBEB' },
        pur: { DEFAULT: '#7C3AED', light: '#F5F3FF' },
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'Nunito', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
