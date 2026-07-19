/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./app/(tabs)/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // 1. Agregamos la sección de colores aquí
      colors: {
        baseText: "#000000", // Negro puro. Un "negro suave" recomendado para lectura es "#1c1c1e"
      },
      fontFamily: {
        inter: ["inter_300Light"],
        interBold: ["inter_500Medium"],
      },
    },
  },
  plugins: [],
};
