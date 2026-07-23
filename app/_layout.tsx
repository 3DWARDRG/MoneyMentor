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
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      <Stack.Screen name="SetupPinScreen" options={{ headerShown: false }} />
      <Stack.Screen name="UnlockScreen" options={{ headerShown: false }} />
      <Stack.Screen name="SelectUserScreen" options={{ headerShown: false }} />

      <Stack.Screen
        name="reminders/new"
        options={{ title: "Nuevo recordatorio" }}
      />

      <Stack.Screen
        name="reminders/[id]"
        options={{ title: "Editar recordatorio" }}
      />

      <Stack.Screen name="accounts/new" options={{ title: "Nueva Cuenta" }} />

      <Stack.Screen
        name="accounts/[id]"
        options={{ title: "Detalle Cuenta" }}
      />
    </Stack>
  );
}
