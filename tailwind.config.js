/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.{ejs,html,js}",
    "./public/**/*.{js,css,html}"
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#1C2530',
        accent: '#0F172A',
        primary: '#3B82F6',
      }
    },
  },
  plugins: [],
}