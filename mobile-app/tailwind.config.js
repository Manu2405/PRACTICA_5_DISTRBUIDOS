/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        semapa: {
          primary: '#0B3D5C',
          secondary: '#1A7FB5',
          accent: '#2EC4B6',
          dark: '#051E2E',
          light: '#E8F4F8',
          warning: '#F4A261',
          danger: '#E76F51',
        },
      },
    },
  },
  plugins: [],
};
