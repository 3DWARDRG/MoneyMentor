import InputBlock from "@/components/InputBlock";
import { router } from "expo-router";
import React , { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { Svg, Path } from "react-native-svg";
import MoneyMentorLogo from "@/components/ui/MoneyMentorLogo";


export default function RegisterScreen() {
      const [isChecked, setIsChecked] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="p-8 bg-white"
    >
      <View className="flex flex-col justify-center min-h-full">
        {/* Encabezado */}
        <View className="text-center mb-8 items-center">
          <View className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MoneyMentorLogo />
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
            {/* Nombre */}
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Nombre
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="Tu nombre"
            />

            {/* Apellidos */}
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Apellidos
            </Text>
            <TextInput
              className="px-4 py-3 border border-gray-300 rounded-lg mb-4"
              placeholder="Tus Apellidos"
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

          <View className="flex-row items-center mb-4 ">
                  <Switch
        value={isChecked}
        onValueChange={setIsChecked}
        trackColor={{ false: '#ccc', true: '#2563eb' }}
        thumbColor="#fff"
      />
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
