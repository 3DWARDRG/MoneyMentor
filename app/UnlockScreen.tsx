import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UnlockScreen() {
  const [pin, setPin] = useState("");

  const {
    selectedUserId,
    users,
    verifyPinForSelectedUser,
    authenticateBiometricsForSelectedUser,
  } = useAuthStore();

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId],
  );

  useEffect(() => {
    if (!selectedUserId) {
      router.replace("/SelectUserScreen");
    }
  }, [selectedUserId]);

  useEffect(() => {
    const tryBiometric = async () => {
      if (!selectedUserId) return;

      const success = await authenticateBiometricsForSelectedUser();
      if (success) {
        router.replace("/(tabs)");
      }
    };

    tryBiometric();
  }, [selectedUserId]);

  const handleVerify = async () => {
    const success = await verifyPinForSelectedUser(pin);

    if (!success) {
      Alert.alert("Error", "PIN incorrecto");
      setPin("");
      return;
    }

    router.replace("/(tabs)");
  };

  const handleBiometrics = async () => {
    const success = await authenticateBiometricsForSelectedUser();

    if (success) {
      router.replace("/(tabs)");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-center p-6">
      <View>
        <Text className="text-3xl font-bold text-center mb-2">MoneyMentor</Text>

        <Text className="text-gray-500 text-center mb-8">
          Ingresa tu PIN para acceder
        </Text>

        <Text className="text-gray-500 text-center mb-2">
          Usuario seleccionado
        </Text>

        <Text className="text-xl font-semibold text-center mb-6">
          {selectedUser
            ? `${selectedUser.names} ${selectedUser.lastName ?? ""}`
            : "Sin usuario"}
        </Text>

        <TextInput
          className="border border-gray-300 rounded-lg p-4 mb-6 text-lg text-center tracking-widest"
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
          placeholder="••••"
          value={pin}
          onChangeText={setPin}
          onSubmitEditing={handleVerify}
          autoFocus
        />

        <TouchableOpacity
          className="bg-blue-600 py-4 rounded-lg"
          onPress={handleVerify}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Desbloquear
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="mt-4 py-2" onPress={handleBiometrics}>
          <Text className="text-blue-600 text-center">
            Usar huella / Face ID
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-2 py-2"
          onPress={() => router.replace("/SelectUserScreen")}
        >
          <Text className="text-gray-500 text-center">Cambiar de usuario</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
