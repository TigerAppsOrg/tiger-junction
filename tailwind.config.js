/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontSize: {
        "2xs": ".65rem",
      },
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
        std: {
          red: "hsl(1, 100%, 69%)",
          darkRed: "hsl(1, 100%, 59%)",
          orange: "hsl(35, 99%, 65%)",   
          darkOrange: "hsl(35, 99%, 55%)",
          blue: "hsl(197, 34%, 72%)", 
          darkBlue: "hsl(197, 34%, 62%)",
          yellow: "hsl(60, 96%, 74%)", 
          darkYellow: "hsl(60, 96%, 64%)",
          green: "hsl(120, 52%, 75%)", 
          darkGreen: "hsl(120, 52%, 65%)",
          pink: "hsl(330, 100%, 80%)", 
          darkPink: "hsl(330, 100%, 70%)",
          purple: "hsl(304, 33%, 70%)", 
          darkPurple: "hsl(304, 33%, 60%)",
          gray: "hsl(0, 0%, 66%)",
          darkGray: "hsl(0, 0%, 56%)",
        },
        deepblue: {
          dark: "#6157FF",  // "#000428",
          light: "#EE49FD", // "#004E92",
        }
      },
      fontFamily: {
        lato: ["Lato", "sans-serif"],
      },
    },
  },
  plugins: [],
  darkMode: "class",
}

