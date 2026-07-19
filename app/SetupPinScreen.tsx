import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SetupPinScreen() {
  const [names, setNames] = useState("");
  const [lastName, setLastName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const { createLocalUser, setupPinForSelectedUser } = useAuthStore();

  const handleCreateUser = async () => {
    try {
      if (!names.trim()) {
        Alert.alert("Error", "Debes ingresar al menos un nombre");
        return;
      }

      if (pin.length < 4) {
        Alert.alert("Error", "El PIN debe tener al menos 4 dígitos");
        return;
      }

      if (pin !== confirmPin) {
        Alert.alert("Error", "Los PIN no coinciden");
        return;
      }

      setLoading(true);

      const createdUserId = await createLocalUser({
        names: names.trim(),
        lastName: lastName.trim(),
      });

      if (!createdUserId) {
        Alert.alert("Error", "No se pudo crear el usuario");
        return;
      }

      const ok = await setupPinForSelectedUser(pin);

      if (!ok) {
        Alert.alert("Error", "No se pudo configurar el PIN");
        return;
      }

      router.replace("/(tabs)");
    } catch (error) {
      console.error("❌ Error creando usuario + PIN:", error);
      Alert.alert("Error", "Ocurrió un problema al crear el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-400">
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          justifyContent: "center",
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text className="text-3xl font-bold text-center mb-2">
            Crear perfil
          </Text>

          <Text className="text-gray-500 text-center mb-8">
            Crea un usuario local y protege su información con un PIN
          </Text>

          <Text className="text-sm font-medium text-black mb-2">Nombre</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-4 mb-4 text-base"
            placeholder="Edward"
            value={names}
            onChangeText={setNames}
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">
            Apellido (opcional)
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-4 mb-4 text-base"
            placeholder="Rodríguez"
            value={lastName}
            onChangeText={setLastName}
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">
            PIN (4-6 dígitos)
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-4 mb-4 text-lg text-center"
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            value={pin}
            onChangeText={setPin}
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">
            Confirmar PIN
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-4 mb-8 text-lg text-center"
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            value={confirmPin}
            onChangeText={setConfirmPin}
          />

          <TouchableOpacity
            className={`py-4 rounded-lg ${loading ? "bg-gray-400" : "bg-blue-600"}`}
            onPress={handleCreateUser}
            disabled={loading}
          >
            <Text className="text-black text-center font-semibold text-lg">
              {loading ? "Creando perfil..." : "Crear usuario"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4 py-2"
            onPress={() => router.replace("/SelectUserScreen")}
            disabled={loading}
          >
            <Text className="text-blue-600 text-center">
              Ya existe un usuario
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
