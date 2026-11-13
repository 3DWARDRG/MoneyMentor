import { useUsers } from "@/hooks/useUsers";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import {
  FlatList,
  
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView  } from "react-native-safe-area-context";
import { usePreventBack } from "@/hooks/usePreventBack";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";

export default function SelectUserScreen() {
  const { selectUser, isHydrating } = useAuthStore();
  const users = useUsers();

  usePreventBack();

  const handleSelectUser = async (userId: string) => {
    selectUser(userId);
    router.replace("/UnlockScreen");
  };

  const handleCreateUser = () => {
    router.replace("/SetupPinScreen");
  };

  return (
    <SafeAreaView className="flex-1 bg-deep dark:bg-deep-dark">
      <ScreenBackdrop />
      <View className="flex-1 justify-center p-6">
      <Text className="text-3xl font-bold text-center mb-2 text-ink dark:text-ink-dark">
        Selecciona tu perfil
      </Text>
      <Text className="text-muted dark:text-muted-dark text-center mb-8">
        Elige el usuario con el que quieres ingresar a MoneyMentor
      </Text>

      {isHydrating ? (
        <Text className="text-center text-muted dark:text-muted-dark">Cargando usuarios...</Text>
      ) : users.length === 0 ? (
        <View className="items-center mt-10">
          <Text className="text-muted dark:text-muted-dark mb-6 text-center">
            No hay usuarios locales todavía
          </Text>
          <TouchableOpacity
            className="bg-accent dark:bg-accent-dark py-4 px-6 rounded-xl"
            onPress={handleCreateUser}
          >
            <Text className="text-white font-semibold">
              Crear primer usuario
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="bg-panel dark:bg-panel-dark rounded-2xl p-4 border border-black/10 dark:border-white/10"
                onPress={() => handleSelectUser(item.id)}
              >
                <Text className="text-lg font-semibold text-ink dark:text-ink-dark">
                  {item.names} {item.lastName ?? ""}
                </Text>
                <Text className="text-muted dark:text-muted-dark mt-1">
                  {item.email || "Usuario local"}
                </Text>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            className="bg-accent dark:bg-accent-dark py-4 rounded-xl mt-4"
            onPress={handleCreateUser}
          >
            <Text className="text-white text-center font-semibold">
              Crear otro usuario
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
    </SafeAreaView>
  );
}
