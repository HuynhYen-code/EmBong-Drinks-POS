/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
      },
      colors: {
        brand: {
          500: '#4A6741', // Bắt buộc sử dụng mã màu #4A6741
        },
        surface: '#FAF9F6', /* Off-white */
        textmain: '#334155' /* Dark grey */
      }
    },
  },
  plugins: [],
}
