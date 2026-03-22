/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'vedic-brown': '#3E2A1A',
        'vedic-cosmic': '#56346E',
        'vedic-gold': '#E2B857',
        'vedic-goldLight': '#F4D27A',
        'vedic-cream': '#FBF5EC',
        'vedic-paper': '#F6EFE4'
      },
      boxShadow: {
        'soft-panel': '0 18px 45px rgba(62,42,26,0.18)'
      }
    }
  },
  plugins: []
};

