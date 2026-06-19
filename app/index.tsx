import { useAuthStore } from "@/store/useAuthStore";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function IndexGate() {
  const {
    isHydrating,
    isUnlocked,
    userId,
    selectedUserId,
    users,
    hydrateAuth,
  } = useAuthStore();

  useEffect(() => {
    hydrateAuth();
  }, []);

  if (isHydrating) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Cargando MoneyMentor...</Text>
      </View>
    );
  }

  // Ya está autenticado correctamente
  if (isUnlocked && userId) {
    return <Redirect href="/(tabs)" />;
  }

  // No hay usuarios aún
  if (users.length === 0) {
    return <Redirect href="/SetupPinScreen" />;
  }

  // Hay usuarios pero aún no se ha elegido uno
  if (!selectedUserId) {
    return <Redirect href="/SelectUserScreen" />;
  }

  // Hay usuario seleccionado, falta PIN
  return <Redirect href="/UnlockScreen" />;
}
