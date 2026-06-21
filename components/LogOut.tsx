import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { Alert, Text, TouchableOpacity } from "react-native";

export default function LogoutButton() {
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/UnlockScreen");
        },
      },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      className="bg-red-50 border border-red-200 px-4 py-2 rounded-lg"
    >
      <Text className="text-red-600 font-medium">Cerrar sesión</Text>
    </TouchableOpacity>
  );
}
