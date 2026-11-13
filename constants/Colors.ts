/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// 1. Paleta moderna: navy profundo con acentos azul
const tintColorLight = "#4b9aff";
const tintColorDark = "#58a5ff";

export const Colors = {
  light: {
    text: "#f6f8ff",
    background: "#07101e",
    tint: tintColorLight,
    icon: "#97a4bb",
    tabIconDefault: "#97a4bb",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#f6f8ff",
    background: "#07101e",
    tint: tintColorDark,
    icon: "#97a4bb",
    tabIconDefault: "#97a4bb",
    tabIconSelected: tintColorDark,
  },
};
