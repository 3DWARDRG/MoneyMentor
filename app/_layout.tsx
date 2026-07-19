import { Buffer } from "buffer";
import "../global.css";

global.Buffer = Buffer;

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// 1. Evitamos que la pantalla de inicio desaparezca antes de tiempo
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 2. Ocultamos el Splash Screen nativo en cuanto este componente se monte
  useEffect(() => {
    // Si estuvieras cargando fuentes aquí, pondrías esto dentro de un if(fontsLoaded)
    SplashScreen.hideAsync();
  }, []);

  // 5. Tu navegación original intacta
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SetupPinScreen" />
      <Stack.Screen name="UnlockScreen" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="SelectUserScreen" />
    </Stack>
  );
}
