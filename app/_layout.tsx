import { Buffer } from "buffer";
import "../global.css";

global.Buffer = Buffer;

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ThemeSync from "@/components/ThemeSync";
import { useColorScheme } from "nativewind";
import AppOverlay from "@/components/ui/AppOverlay";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceCacheStore } from "@/store/useFinanceCacheStore";
import { resetGlobalSession } from "@/store/resetSession";

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
    
    // ✅ Llama al load directamente. 
    // Al hacerlo así, React no lo vigila, matando el bucle infinito al 100%.
    useFinanceCacheStore.getState().load(userId);

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
    headerShadowVisible: false,
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen name="SetupPinScreen" options={{ headerShown: false }} />
        <Stack.Screen name="UnlockScreen" options={{ headerShown: false }} />
        <Stack.Screen
          name="SelectUserScreen"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="reminders/new"
          options={{ title: "Nuevo recordatorio", headerTitleAlign: "center" }}
        />

        <Stack.Screen
          name="reminders/[id]"
          options={{ title: "Editar recordatorio", headerTitleAlign: "center" }}
        />

        <Stack.Screen
          name="accounts/new"
          options={{ title: "Nueva Cuenta", headerTitleAlign: "center" }}
        />

        <Stack.Screen
          name="accounts/[id]"
          options={{ title: "Detalle Cuenta", headerTitleAlign: "center" }}
        />

        <Stack.Screen
          name="transactions/new"
          options={({ route }: any) => ({
            title: route.params?.id
              ? "Editar transacción"
              : "Nueva transacción",
            headerTitleAlign: "center",
          })}
        />

        <Stack.Screen
          name="transactions/[id]"
          options={{ title: "Detalle transacción", headerTitleAlign: "center" }}
        />

        <Stack.Screen
          name="goals/new"
          options={{ title: "Nueva meta", headerTitleAlign: "center" }}
        />

        <Stack.Screen
          name="goals/[id]"
          options={{ title: "Detalle meta", headerTitleAlign: "center" }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
