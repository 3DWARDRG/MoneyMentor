import MoneyMentorLogo from "@/components/ui/MoneyMentorLogo";
import { database } from "@/database/index";
import ServiceDBFacade from "@/database/serviceDb";
import { useUserForm } from "@/store/useUserForm";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterScreen() {
  const serviceDB = new ServiceDBFacade(database);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { name, last_name, email, password, confirmPassword, setField } =
    useUserForm();

  const validateAndRegister = async () => {
    // Validaciones
    if (!name || !last_name || !email || !password) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }
    if (!isChecked) {
      Alert.alert(
        "Acepta términos",
        "Debes aceptar los términos y condiciones",
      );
      return;
    }

    setLoading(true);
    try {
      // Crear usuario con los campos correctos según el schema
      const now = Date.now();
      const nuevoUsuario = await serviceDB.create("users", {
        names: name, // ← ojo: en tu schema es "names" (plural) no "name"
        last_name: last_name,
        email: email,
        password: password, // ← columna "password" (no "password_hash")
        confirm_email: false,
        creation_date: now,
        last_access: now,
      });

      console.log("Usuario creado:", nuevoUsuario.id);
      Alert.alert("Éxito", "Cuenta creada correctamente", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="p-8 bg-white"
    >
      <View className="flex flex-col justify-center min-h-full">
        <View className="text-center mb-8 items-center">
          <View className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MoneyMentorLogo />
          </View>
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Crear cuenta
          </Text>
          <Text className="text-gray-600">
            Únete a MoneyMentor y toma control de tus finanzas
          </Text>
        </View>

        <View className="space-y-6">
          <View className="p-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Nombre
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="Tu nombre"
              onChangeText={(text) => setField("name", text)}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">
              Apellidos
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="Tus Apellidos"
              onChangeText={(text) => setField("last_name", text)}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={(text) => setField("email", text)}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="••••••••"
              secureTextEntry
              onChangeText={(text) => setField("password", text)}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">
              Confirmar contraseña
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="••••••••"
              secureTextEntry
              onChangeText={(text) => setField("confirmPassword", text)}
            />
          </View>

          <View className="flex-row items-center mb-4">
            <Switch
              value={isChecked}
              onValueChange={setIsChecked}
              trackColor={{ false: "#ccc", true: "#2563eb" }}
              thumbColor="#fff"
            />
            <Text className="ml-2 text-sm text-gray-600 flex-1">
              Acepto los{" "}
              <Text className="text-blue-600 font-medium">
                términos y condiciones
              </Text>{" "}
              y la{" "}
              <Text className="text-blue-600 font-medium">
                política de privacidad
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            className="bg-blue-600 py-3 rounded-lg"
            onPress={validateAndRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-medium">
                Crear cuenta
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="mt-6 text-center">
          <Text className="text-gray-600">
            ¿Ya tienes una cuenta?{" "}
            <Text
              className="text-blue-600 font-medium"
              onPress={() => router.push("/login")}
            >
              Inicia sesión aquí
            </Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
