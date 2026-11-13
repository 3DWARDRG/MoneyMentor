import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";

const ThemeSync = () => {
  const theme = useSettingsStore((s) => s.theme);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  return null;
};

export default ThemeSync;
