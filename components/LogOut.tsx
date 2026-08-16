import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SvgXml } from "react-native-svg";

const editIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5H6a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-5"/>
    <path d="M16.586 6.586a2 2 0 112.828 2.828L11.828 15H9v-2.828l7.586-7.586z"/>
  </svg>`;

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
      className="p-4 flex-row items-center"
    >
      <View className="h-10 w-10 rounded-full bg-expense/10 dark:bg-expense-dark/10 flex items-center justify-center mr-3">
        <SvgXml xml={editIconSvg} width={20} height={20} fill="#ff8890" />
      </View>
      <View className="flex-grow">
        <Text className=" font-medium text-ink dark:text-ink-dark">Cerrar sesión</Text>
        <Text className="text-sm text-muted dark:text-muted-dark">Salir de la aplicación</Text>
      </View>
      <SvgXml xml={editIconSvg} width={20} height={20} fill="#97a4bb" />
    </TouchableOpacity>
  );
}
