import React from 'react';
import { View, Text } from 'react-native';
import ProfileOption from './ProfileOption';

const ProfileScreen = () => {
  return (
    <View className="p-5 flex-1 bg-white">
      {/* Header */}
      <View className="items-center mb-6">
        <View className="h-24 w-24 bg-blue-100 rounded-full items-center justify-center mb-3">
          <Text className="text-blue-600 text-3xl font-bold">C</Text>
        </View>
        <Text className="text-xl font-bold">Carlos Rodríguez</Text>
        <Text className="text-gray-500">carlos.rodriguez@email.com</Text>
      </View>

      {/* Options List */}
      <View className="bg-white rounded-lg shadow-sm mb-5">
        <ProfileOption
          iconSvg={`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>`}
          bgColor="bg-blue-100"
          text="Información personal"
        />
        <ProfileOption
          iconSvg={`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>`}
          bgColor="bg-purple-100"
          text="Métodos de pago"
        />
        <ProfileOption
          iconSvg={`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>`}
          bgColor="bg-green-100"
          text="Configuración"
        />
        <ProfileOption
          iconSvg={`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>`}
          bgColor="bg-amber-100"
          text="Ayuda y soporte"
        />
        <ProfileOption
          iconSvg={`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>`}
          bgColor="bg-red-100"
          text="Cerrar sesión"
          textColor="text-red-600"
        />
      </View>

      {/* Footer */}
      <View className="items-center">
        <Text className="text-gray-500 text-sm">Versión 1.0.0</Text>
        <Text className="text-gray-500 text-sm mt-1">© 2023 FinApp. Todos los derechos reservados.</Text>
      </View>
    </View>
  );
};

export default ProfileScreen;
