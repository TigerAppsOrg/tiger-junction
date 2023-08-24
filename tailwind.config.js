/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: "#6485fd",
        secondary: "#72c7e9",
        tertiary: "#8a65e7",
        accent: "#ff9f00",
        highlight: "#dafd81",
        synth: {
          light: "#3d2d52",
          submedium: "#2B203A",
          medium: "#241B31",
          dark: "#171520",
          accent: "#FF8F00"
        },
        deepblue: {
          dark: "#6157FF",  // "#000428",
          light: "#EE49FD", // "#004E92",
        }
      },
      fontFamily: {
        lato: ["Lato", "sans-serif"],
        roboto: ["Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
  darkMode: "class",
}

