/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A5F',
          50: '#E8EEF5',
          100: '#C5D4E6',
          200: '#9DB7D3',
          300: '#759AC0',
          400: '#4D7DAD',
          500: '#1E3A5F',
          600: '#192F4E',
          700: '#14243D',
          800: '#0F192C',
          900: '#0A0E1B',
        },
        accent: {
          DEFAULT: '#F97316',
          50: '#FFF4ED',
          100: '#FFE4CC',
          200: '#FFC899',
          300: '#FFAB66',
          400: '#FF8F33',
          500: '#F97316',
          600: '#EA6A00',
          700: '#C45800',
          800: '#9E4700',
          900: '#783600',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          dark: '#065F46',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          dark: '#991B1B',
        },
        bg: '#F8FAFC',
      },
      fontFamily: {
        // Devanagari font listed first so Hindi glyphs render correctly;
        // Latin glyphs fall through to Sora/Nunito automatically.
        heading: ['Sora', '"Noto Sans Devanagari"', 'sans-serif'],
        body: ['Nunito', '"Noto Sans Devanagari"', 'sans-serif'],
      },
      screens: {
        xs: '375px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(30, 58, 95, 0.08)',
        'card-hover': '0 4px 24px rgba(30, 58, 95, 0.14)',
      },
    },
  },
  plugins: [],
}
