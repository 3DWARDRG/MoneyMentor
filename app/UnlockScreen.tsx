import { usePreventBack } from "@/hooks/usePreventBack";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { useEffect, useMemo, useState , useCallback   } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View  } from "react-native";
import { SafeAreaView  } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";

export default function UnlockScreen() {
  const [pin, setPin] = useState("");

  usePreventBack();

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
    <SafeAreaView className="flex-1 bg-deep dark:bg-deep-dark ">
      <ScreenBackdrop />
      <View className="flex-1 justify-center p-6">
      <View >
        <Text className="text-3xl font-bold text-center mb-2 text-ink dark:text-ink-dark">MoneyMentor</Text>

        <Text className="text-muted dark:text-muted-dark text-center mb-8">
          Ingresa tu PIN para acceder
        </Text>

        <Text className="text-muted dark:text-muted-dark text-center mb-2">
          Usuario seleccionado
        </Text>

        <Text className="text-xl font-semibold text-center mb-6 text-ink dark:text-ink-dark">
          {selectedUser
            ? `${selectedUser.names} ${selectedUser.lastName ?? ""}`
            : "Sin usuario"}
        </Text>

        <TextInput
          className="border border-black/10 dark:border-white/10 rounded-lg p-4 mb-6 text-lg text-center tracking-widest text-ink dark:text-ink-dark bg-deepSoft dark:bg-deepSoft-dark"
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
          placeholder="••••"
          placeholderTextColor="#9ca3af"
          value={pin}
          onChangeText={setPin}
          onSubmitEditing={handleVerify}
        />

        <TouchableOpacity
          className="bg-accent dark:bg-accent-dark py-4 rounded-lg"
          onPress={handleVerify}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Desbloquear
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="my-2 bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10 text-center py-4 rounded-lg" onPress={handleBiometrics}>
          <Text className="text-ink dark:text-ink-dark text-center font-bold">
            Usar huella / Face ID
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className=" py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg"
          onPress={() => router.replace("/SelectUserScreen")}
        >
          <Text className="text-accent dark:text-accent-dark text-center">Cambiar de usuario</Text>
        </TouchableOpacity>
      </View>
            </View>
    </SafeAreaView>
  );
}
