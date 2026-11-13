/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./app/(tabs)/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      // Tokens duales: el valor base es el tema claro, `-dark` es el navy oscuro
      colors: {
        baseText: "#000000",
        deep: "#faf8f4",
        "deep-dark": "#07101e",
        deepSoft: "#f3f0ea",
        "deepSoft-dark": "#0a1220",
        panel: "#ffffff",
        "panel-dark": "#0c1324",
        ink: "#1c1917",
        "ink-dark": "#f6f8ff",
        muted: "#7a7266",
        "muted-dark": "#97a4bb",
        accent: "#2563eb",
        "accent-dark": "#4b9aff",
        accentSoft: "#3b82f6",
        "accentSoft-dark": "#58a5ff",
        income: "#15803d",
        "income-dark": "#4be0a6",
        expense: "#b91c1c",
        "expense-dark": "#ff8890",
        line: "#e7e2d8",
        "line-dark": "rgba(255,255,255,0.12)",
      },
      fontFamily: {
        inter: ["inter_300Light"],
        interBold: ["inter_500Medium"],
      },
    },
  },
  plugins: [],
};
