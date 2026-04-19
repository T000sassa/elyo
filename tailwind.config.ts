import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-body)', 'DM Sans', 'system-ui', 'sans-serif'],
        body:    ['var(--font-body)', 'DM Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md': '0 4px 12px -2px rgb(0 0 0 / 0.07), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
        'card-lg': '0 12px 28px -6px rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.04)',
        'inner-sm': 'inset 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        glow: '0 0 20px -4px rgb(20 184 166 / 0.35)',
      },
      colors: {
        elyo: {
          50:  '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6e0',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#0a4540',
          950: '#051f1d',
        },
        sage: {
          50:  '#f2f7f4',
          100: '#e0ecdf',
          200: '#c4d9c1',
          300: '#9abf96',
          400: '#6da069',
          500: '#4c8448',
          600: '#3a6937',
          700: '#30542e',
          800: '#284527',
          900: '#223a21',
        },
        warm: {
          50:  '#faf9f7',
          100: '#f5f3ef',
          200: '#ede9e1',
          300: '#ddd7cb',
          400: '#c5bda9',
          500: '#a89e87',
          600: '#8a7f68',
          700: '#726855',
          800: '#5e5647',
          900: '#4e483d',
        },
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        'elyo-green': {
          50:  '#EEF3F1',
          100: '#D6E3DD',
          200: '#9FBEB1',
          300: '#5C8574',
          500: '#1B4D3E',
          700: '#0F3329',
          900: '#07201A',
        },
        'elyo-amber': {
          50:  '#FBF3E5',
          100: '#F4DFB4',
          300: '#E0B565',
          500: '#C8913A',
          700: '#9A6A22',
        },
        'elyo-bg':      '#F7F6F2',
        'elyo-surface': '#FFFFFF',
        'elyo-line':    '#E6E2D6',
        'elyo-ink': {
          DEFAULT: '#1A1C1A',
          soft:    '#55584F',
          mute:    '#8E8F86',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
