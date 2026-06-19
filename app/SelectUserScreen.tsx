import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { useEffect } from "react";
import {
    FlatList,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function SelectUserScreen() {
  const { users, refreshUsers, selectUser, isHydrating } = useAuthStore();

  useEffect(() => {
    refreshUsers();
  }, []);

  const handleSelectUser = async (userId: string) => {
    selectUser(userId);
    router.replace("/UnlockScreen");
  };

  const handleCreateUser = () => {
    router.replace("/SetupPinScreen");
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6 py-8">
      <Text className="text-3xl font-bold text-center mb-2">
        Selecciona tu perfil
      </Text>
      <Text className="text-gray-500 text-center mb-8">
        Elige el usuario con el que quieres ingresar a MoneyMentor
      </Text>

      {isHydrating ? (
        <Text className="text-center text-gray-500">Cargando usuarios...</Text>
      ) : users.length === 0 ? (
        <View className="items-center mt-10">
          <Text className="text-gray-500 mb-6 text-center">
            No hay usuarios locales todavía
          </Text>
          <TouchableOpacity
            className="bg-blue-600 py-4 px-6 rounded-xl"
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
                className="bg-neutral-100 rounded-2xl p-4 border border-neutral-200"
                onPress={() => handleSelectUser(item.id)}
              >
                <Text className="text-lg font-semibold text-black">
                  {item.names} {item.lastName ?? ""}
                </Text>
                <Text className="text-gray-500 mt-1">
                  {item.email || "Usuario local"}
                </Text>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            className="bg-black py-4 rounded-xl mt-4"
            onPress={handleCreateUser}
          >
            <Text className="text-white text-center font-semibold">
              Crear otro usuario
            </Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}