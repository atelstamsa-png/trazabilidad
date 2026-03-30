/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1a3a5c",     // azul oscuro que te gusta
        accent: "#2e86de",      // azul brillante
      }
    },
  },
  plugins: [],
}