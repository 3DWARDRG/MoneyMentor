import { Buffer } from "buffer";
import "../global.css";

global.Buffer = Buffer;

import ThemeSync from "@/components/ThemeSync";
import AppOverlay from "@/components/ui/AppOverlay";
import { resetGlobalSession } from "@/store/resetSession";
import { useAuthStore } from "@/store/useAuthStore";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// 1. Evitamos que la pantalla de inicio desaparezca antes de tiempo
SplashScreen.preventAutoHideAsync();

function SessionWatcher() {
  const userId = useAuthStore((s) => s.userId);

  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    const changed = userId !== prevUserId.current;
    prevUserId.current = userId;

    if (!userId) {
      // ✅ Llama al método directamente desde el store, sin pasarlo por el hook
      resetGlobalSession();
      return;
    }

    if (changed) {
      resetGlobalSession();
    }
  }, [userId]); // 🎯 MÁGIA: Ahora la única dependencia real es el userId

  return null;
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const stackHeaderStyle = {
    headerStyle: {
      backgroundColor: isDark ? "#0c1324" : "#ffffff",
    },
    headerTintColor: isDark ? "#f6f8ff" : "#1c1917",
    headerTitleStyle: {
      fontFamily: "inter",
      fontSize: 17,
      fontWeight: "600" as const,
    },
    headerShadowVisible: true,
  };
  // 2. Ocultamos el Splash Screen nativo en cuanto este componente se monte
  useEffect(() => {
    // Si estuvieras cargando fuentes aquí, pondrías esto dentro de un if(fontsLoaded)
    SplashScreen.hideAsync();
  }, []);

  // 5. Tu navegación original intacta
  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: isDark ? "#0c1324" : "#faf8f4" }}
    >
      <SessionWatcher />
      <ThemeSync />
      <AppOverlay />
      <Stack screenOptions={stackHeaderStyle}>
        {/* Las pestañas */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Pantallas sueltas sin tabs */}
        <Stack.Screen name="SetupPinScreen" options={{ headerShown: false }} />
        <Stack.Screen name="UnlockScreen" options={{ headerShown: false }} />
        <Stack.Screen
          name="SelectUserScreen"
          options={{ headerShown: false }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
