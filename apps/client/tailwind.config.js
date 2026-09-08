/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🖤 Professional Dark
        dark: {
          50: '#f6f6f7',
          100: '#e1e1e3',
          200: '#c2c4c8',
          300: '#9ea1a7',
          400: '#7a7e87',
          500: '#5c5f68',
          600: '#4a4d55',
          700: '#3d3f46',
          800: '#2d2f35',
          900: '#1a1b1f',
          950: '#111216',
        },
        // 🔵 Primary Blue
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // ⚪ Surface (GRAY ke naam se)
        surface: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
        },
        // 👑 Luxury Champagne Gold
        gold: {
          50: '#FDFBF7',
          100: '#FAF5EA',
          200: '#F3E8CE',
          300: '#EAD5A8',
          400: '#DEBF7C',
          500: '#C5A059',
          600: '#B0883E',
          700: '#8C672B',
          800: '#6E4F22',
          900: '#4D3618',
        },
        // 🌌 Royal Midnight Slate
        midnight: {
          700: '#334155',
          800: '#1E293B',
          850: '#172033',
          900: '#0F172A',
          950: '#0A0F1D',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
        'card': '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        'elevated': '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}