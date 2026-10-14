/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070908',
          900: '#0D120E',
          800: '#151C17',
          700: '#202A23',
        },
        neon: {
          DEFAULT: '#22C55E',
          soft: '#86EFAC',
          deep: '#16A34A',
        },
        mint: '#83F3C0',
      },
    },
  },
  plugins: [],
};
