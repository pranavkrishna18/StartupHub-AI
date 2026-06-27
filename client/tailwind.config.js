/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: {
          900: '#06050c',
          800: '#0c0a1a',
          700: '#14112e',
        },
        brand: {
          cyan: '#00f2fe',
          purple: '#4facfe',
          violet: '#7c3aed'
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}

