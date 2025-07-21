import React , { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { Svg, Path } from 'react-native-svg'
import SocialButton from '@/components/SocialButton'
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import MoneyMentorLogo from '@/components/ui/MoneyMentorLogo';

export default function LoginScreen() {

      const [isChecked, setIsChecked] = useState(false);

const handleLogin = async () => {
  const token = 'abc123'; // el token real que recibas
  useAuthStore.getState().login(token);
  router.replace('/(tabs)'); // redirige a tu dashboard
};

const handleSwitchChange = (value: boolean) => {
  console.log('Switch cambiado a:', value);
  setIsChecked(value);
};

  return (
    <ScrollView className='flex-grow p-8 pt-20 bg-white'>
      <View className="text-center mb-8">
        <View className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <MoneyMentorLogo />
        </View>
        <View className=" items-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">MoneyMentor</Text>
        <Text className="text-gray-600">Gestiona tus finanzas de manera inteligente</Text>
        </View>
      </View>

      <View className="space-y-6">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-2">Correo electrónico</Text>
          <TextInput
            placeholder="tu@email.com"
            className="px-4 py-3 border border-gray-300 rounded-lg my-4"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-2">Contraseña</Text>
          <TextInput
            placeholder="••••••••"
            className="px-4 py-3 border border-gray-300 rounded-lg my-4"
            secureTextEntry
          />
        </View>

        <View className="flex flex-row justify-between items-center">
          <View className="flex flex-row items-center">
                        <Switch
                value={isChecked}
                onValueChange={handleSwitchChange}
                trackColor={{ false: '#ccc', true: '#2563eb' }}
                thumbColor="#fff"
              />
            <Text className="ml-2 text-sm text-gray-600">Recordarme</Text>
          </View>
          <TouchableOpacity>
            <Text className="text-sm text-blue-600">¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="bg-blue-600 py-3 rounded-lg my-4">
          <Text className="text-white text-center font-medium" onPress={handleLogin}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-6 text-center">
        <Text className="text-sm text-gray-600">
          ¿No tienes una cuenta?{' '}
          <Text className="text-blue-600 font-medium" onPress={() => router.push('/register')}>Regístrate aquí</Text>
        </Text>
      </View>

      <View className="mt-8">
        <View className="relative">
          <View className="absolute inset-0 flex items-center">
            <View className="w-full border-t border-gray-300" />
          </View>
          <View className="relative flex justify-center text-sm">
            <Text className="px-2 bg-white text-gray-500">O continúa con</Text>
          </View>
        </View>

        <View className="mt-6 gap-3 flex-row flex-1 justify-center">
          <SocialButton provider="Google" />
          <SocialButton provider="Facebook" />
        </View>
      </View>
    </ScrollView>
  )
}
