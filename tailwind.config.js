/** @type {import('tailwindcss').Config} */
const glassTokens = require('./src/constants/glass-tokens.json');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...glassTokens.colors,
      },
    },
  },
  plugins: [],
};
