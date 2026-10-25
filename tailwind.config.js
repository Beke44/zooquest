/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        jungle: { 50: '#f1f7f1', 100: '#dcebdc', 200: '#b7d5b8', 400: '#5f9a63', 600: '#2f6b38', 700: '#245530', 800: '#1c4126', 900: '#122b19' },
        sand: { 50: '#fbf8f1', 100: '#f4ecda', 200: '#e9d9b4', 400: '#d2ad62', 600: '#a87b2c' },
        clay: { 400: '#e07a4f', 500: '#d1603a', 600: '#b04a28' },
      },
    },
  },
  plugins: [],
}
