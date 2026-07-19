import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { useEffect, useMemo, useState , useCallback   } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View  } from "react-native";
import { SafeAreaView  } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

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
    console.log(selectedUserId)
    if (!selectedUserId) {
      router.replace("/SelectUserScreen");
    }
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
    <SafeAreaView className="flex-1 bg-blue-400 ">
      <View className="flex-1 bg-white justify-center p-6">
      <View >
        <Text className="text-3xl font-bold text-center mb-2 text-black">MoneyMentor</Text>

        <Text className="text-black text-center mb-8">
          Ingresa tu PIN para acceder
        </Text>

        <Text className="text-black text-center mb-2">
          Usuario seleccionado
        </Text>

        <Text className="text-xl font-semibold text-center mb-6 text-black">
          {selectedUser
            ? `${selectedUser.names} ${selectedUser.lastName ?? ""}`
            : "Sin usuario"}
        </Text>

        <TextInput
          className="border border-gray-300 rounded-lg p-4 mb-6 text-lg text-center tracking-widest text-black"
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
          placeholder="••••"
          value={pin}
          onChangeText={setPin}
          onSubmitEditing={handleVerify}
        />

        <TouchableOpacity
          className="bg-blue-600 py-4 rounded-lg"
          onPress={handleVerify}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Desbloquear
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="my-2 bg-slate-300 text-center py-4 rounded-lg" onPress={handleBiometrics}>
          <Text className="text-white text-center font-bold">
            Usar huella / Face ID
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className=" py-4 bg-lime-300 rounded-lg"
          onPress={() => router.replace("/SelectUserScreen")}
        >
          <Text className="text-gray-400 text-center">Cambiar de usuario</Text>
        </TouchableOpacity>
      </View>
            </View>
    </SafeAreaView>
  );
}
