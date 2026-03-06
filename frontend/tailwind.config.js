/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: '#4f46e5',
        success: {
          500: '#10b981',
        },
        danger: {
          500: '#f43f5e',
        },
        warning: {
          500: '#f59e0b',
        },
      },
      boxShadow: {
        glass: '0 10px 35px rgba(15, 23, 42, 0.25)',
      },
      backgroundImage: {
        grid: 'radial-gradient(rgba(148,163,184,0.15) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
