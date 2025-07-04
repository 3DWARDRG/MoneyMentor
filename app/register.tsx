import InputBlock from "@/components/InputBlock";
import { router } from "expo-router";
import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { Svg, Path } from "react-native-svg";


export default function RegisterScreen() {
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="p-8 bg-white"
    >
      <View className="flex flex-col justify-center min-h-full">
        {/* Encabezado */}
        <View className="text-center mb-8 items-center">
          <View className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Svg
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </Svg>
          </View>
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Crear cuenta
          </Text>
          <Text className="text-gray-600">
            Únete a FinApp y toma control de tus finanzas
          </Text>
        </View>

        {/* Formulario */}
        <View className="space-y-6 ">
          <View className="p-4">
            {/* Nombre completo */}
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Nombre completo
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="Tu nombre completo"
            />

            {/* Correo electrónico */}
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="tu@email.com"
              keyboardType="email-address"
            />

            {/* Contraseña */}
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="••••••••"
              secureTextEntry
            />

            {/* Confirmar contraseña */}
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Confirmar contraseña
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="••••••••"
              secureTextEntry
            />
          </View>

          <View className="flex-row items-start mb-4">
            <View className="h-4 w-4 border border-gray-300 rounded mt-1" />
            <Text className="ml-2 text-sm text-gray-600 flex-1">
              {/* Form Section */}
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

          <TouchableOpacity className="bg-blue-600 py-3 rounded-lg">
            <Text className="text-white text-center font-medium">
              Crear cuenta
            </Text>
          </TouchableOpacity>
        </View>

        {/* Enlace para iniciar sesión */}
        <View className="mt-6 text-center">
          <Text className="text-gray-600">
            ¿Ya tienes una cuenta?{" "}
            <Text className="text-blue-600 font-medium"  onPress={() => router.push('/login')}>
              Inicia sesión aquí
            </Text>
            {/* Register Button */}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
{
  /* Link to Login */
}
