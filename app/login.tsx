import React from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Pressable } from 'react-native'
import { Svg, Path } from 'react-native-svg'
import SocialButton from '@/components/SocialButton'

export default function LoginScreen() {

  return (
    <ScrollView className='flex-grow p-8 bg-white'>
      <View className="text-center mb-8">
        <View className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <Path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </Svg>
        </View>
        <Text className="text-3xl font-bold text-gray-900 mb-2">FinApp</Text>
        <Text className="text-gray-600">Gestiona tus finanzas de manera inteligente</Text>
      </View>

      <View className="space-y-6">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-2">Correo electrónico</Text>
          <TextInput
            placeholder="tu@email.com"
            className="px-4 py-3 border border-gray-300 rounded-lg"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-2">Contraseña</Text>
          <TextInput
            placeholder="••••••••"
            className="px-4 py-3 border border-gray-300 rounded-lg"
            secureTextEntry
          />
        </View>

        <View className="flex flex-row justify-between items-center">
          <View className="flex flex-row items-center">
            <View className="h-4 w-4 border border-gray-300 rounded bg-white" />
            <Text className="ml-2 text-sm text-gray-600">Recordarme</Text>
          </View>
          <TouchableOpacity>
            <Text className="text-sm text-blue-600">¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="bg-blue-600 py-3 rounded-lg">
          <Text className="text-white text-center font-medium">Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-6 text-center">
        <Text className="text-gray-600">
          ¿No tienes una cuenta?{' '}
          <Text className="text-blue-600 font-medium">Regístrate aquí</Text>
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

        <View className="mt-6 flex-row gap-3">
          <SocialButton provider="Google" />
          <SocialButton provider="Facebook" />
        </View>
      </View>
    </ScrollView>
  )
}
