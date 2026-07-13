import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SvgCss, SvgXml } from 'react-native-svg';
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from '@/components/ui/IconSymbol';
import LogOutButton from '@/components/LogOut';
import { NotificationButton } from './NotificactionButton';
import { useAuthStore } from '@/store/useAuthStore';





const userIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"/>
    <path d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
  </svg>`;

const editIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5H6a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-5"/>
    <path d="M16.586 6.586a2 2 0 112.828 2.828L11.828 15H9v-2.828l7.586-7.586z"/>
  </svg>`;

const arrowIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7"/>
  </svg>`;

  const userManagementSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4.354a4 4 0 110 5.292" />
    <path d="M15 21H3v-1a6 6 0 0112 0v1z" />
    <path d="M15 21h6v-1a6 6 0 00-9-5.197" />
    <path d="M21.5 7a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
`;

const arrowSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
`;

const privacySvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12l2 2 4-4" />
    <path d="M18.618 8.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04" />
    <path d="M3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622" />
    <path d="M20.618 5.016c-.249.964-.382 1.974-.382 3.016" />
  </svg>
`;

const paymentSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10h18" />
    <path d="M7 15h1" />
    <path d="M11 15h1" />
    <path d="M5 19h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
`;

const exportSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 17h5l-5 5v-5z"/>
    <path d="M4 19h1a3 3 0 003-3V8a3 3 0 00-3-3H4"/>
    <path d="M4 5v3m0 0h18m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h7"/>
  </svg>
`;

const notificationSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 17h5l-5 5v-5z"/>
    <path d="M4 19h1a3 3 0 003-3V8a3 3 0 00-3-3H4"/>
    <path d="M4 5v3m0 0h18m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h7"/>
  </svg>
`;

const toggleOnSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="10" x="5" y="7" rx="5" ry="5"/>
    <circle cx="15" cy="12" r="3"/>
  </svg>
`;

const settingsSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
`;


const ProfileScreen = () => {

  const { userId } = useAuthStore();

  return (
            <ScrollView>
          <View className="flex-1 box-border bg-white p-4">

      {/* Profile Header */}
      <View className="bg-blue-700 p-6 mb-6 rounded-2xl">
        <View className="flex-row items-center mb-4">
          <View className="h-20 w-20 bg-blue-600 bg-opacity-20 rounded-full flex items-center justify-center mr-4">
            <Text className="text-white text-3xl font-bold">C</Text>
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Carlos Rodríguez</Text>
            <View className="flex-row items-center mt-2">
              <Text className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs text-gray-950">Administrador</Text>
              <Text className="ml-2 text-blue-200 text-xs">Miembro desde noviembre de 2025</Text>
            </View>
          </View>
          <TouchableOpacity
            className="h-10 w-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
            onPress={() => console.log('Edit profile')}
          >
            <SvgXml xml={editIconSvg} width={20} height={20} />
          </TouchableOpacity>
        </View>
        {/* Quick Stats */}
        <View className="flex-row justify-around pt-4 border-t border-white border-opacity-20">
          <View className="items-center">
            <Text className="text-2xl font-bold text-white">24</Text>
            <Text className="text-blue-200 text-xs">Transacciones</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-white">$24,562</Text>
            <Text className="text-blue-200 text-xs">Balance actual</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-white">3</Text>
            <Text className="text-blue-200 text-xs">Recordatorios</Text>
          </View>
        </View>
      </View>

      {/* Account Management Section */}
<View className="mb-6">
      <Text className="font-bold text-gray-900 mb-3">Gestión de cuenta</Text>
      <View className="bg-white rounded-lg shadow-sm">
        <TouchableOpacity
          onPress={() => console.log('Manage users')}
          className="p-4 border-b flex-row items-center"
        >
          <View className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
            <IconSymbol size={20} name="person.circle" color={'black'} />
          </View>
          <View className="flex-grow">
            <Text className="font-medium">Gestionar usuarios</Text>
            <Text className="text-sm text-gray-500">Crear, editar y cambiar usuarios</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">1 usuario</Text>
            <IconSymbol size={20} name="arrow.right" color={'black'} />
          </View>
        </TouchableOpacity>

        <View className="p-4 border-b flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
            <IconSymbol size={20} name="shield" color={'black'} />
          </View>
          <View className="flex-grow">
            <Text className="font-medium">Seguridad y privacidad</Text>
            <Text className="text-sm text-gray-500">Configurar PIN y opciones de seguridad</Text>
          </View>
           <IconSymbol size={20} name="arrow.right" color={'black'} />
        </View>

        <View className="p-4 flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
            <SvgXml xml={paymentSvg} width={20} height={20} fill="#7C3AED" />
          </View>
          <View className="flex-grow">
            <Text className="font-medium">Métodos de pago</Text>
            <Text className="text-sm text-gray-500">Tarjetas y cuentas bancarias</Text>
          </View>
           <IconSymbol size={20} name="arrow.right" color={'black'} />
        </View>
      </View>
    </View>
 {/* <!-- App Settings Section --> */}
     <View className="mb-6">
      <Text className="font-bold text-gray-900 mb-3">Configuración de la app</Text>
      <View className="bg-white rounded-lg shadow-sm">
        <View className="p-4 border-b flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
            <SvgXml xml={exportSvg} width={20} height={20} fill="#D97706" />
          </View>
          <View className="flex-grow">
            <Text className="font-medium">Exportar datos</Text>
            <Text className="text-sm text-gray-500">Descargar transacciones y reportes</Text>
          </View>
           <IconSymbol size={20} name="arrow.right" color={'black'} />
        </View>

        <View className="p-4 border-b flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
            <SvgXml xml={notificationSvg} width={20} height={20} fill="#4338CA" />
          </View>
          <View className="flex-grow">
            <NotificationButton userId={userId ?? ""} />
            <Text className="text-sm text-gray-500">Recordatorios y alertas</Text>
          </View>

        </View>

        <View className="p-4 flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
            <SvgXml xml={settingsSvg} width={20} height={20} fill="#4B5563" />
          </View>
          <View className="flex-grow">
            <Text className="font-medium">Configuración general</Text>
            <Text className="text-sm text-gray-500">Moneda, idioma y preferencias</Text>
          </View>
           <IconSymbol size={20} name="arrow.right" color={'black'} />
        </View>
      </View>
    </View>

        <View className="mb-6">
      <Text className="font-bold text-gray-900 mb-3">Soporte</Text>
      <View className="bg-white rounded-lg shadow-sm">

        <View className="p-4 border-b flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
            <SvgXml xml={editIconSvg} width={20} height={20} fill="#16A34A" />
          </View>
          <View className="flex-grow">
            <Text className="font-medium">Ayuda y soporte</Text>
            <Text className="text-sm text-gray-500">FAQ y contacto</Text>
          </View>
          <SvgXml xml={editIconSvg} width={20} height={20} fill="#9CA3AF" />
        </View>

        <View className="p-4 border-b flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
            <SvgXml xml={editIconSvg} width={20} height={20} fill="#2563EB" />
          </View>
          <View className="flex-grow">
            <Text className="font-medium">Calificar la app</Text>
            <Text className="text-sm text-gray-500">Comparte tu experiencia</Text>
          </View>
          <SvgXml xml={editIconSvg} width={20} height={20} fill="#9CA3AF" />
        </View>

        <TouchableOpacity
          onPress={() => console.log("sdsadasdasdas")}
          className="p-4 flex-row items-center"
        >
          <View className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
            <SvgXml xml={editIconSvg} width={20} height={20} fill="#DC2626" />
          </View>
          <View className="flex-grow">
            <LogOutButton />
            <Text className="text-sm text-gray-500">Salir de la aplicación</Text>
          </View>
          <SvgXml xml={editIconSvg} width={20} height={20} fill="#9CA3AF" />
        </TouchableOpacity>

      </View>
    </View>

      {/* Footer */}
      <View className="p-6 mb-6 text-gray-500 text-sm min-h-10">
        <Text className='mt-5 text-center'>FinApp versión 1.0.0</Text>
        <Text className="mt-5 h-10 text-center">© 2023 FinApp. Todos los derechos reservados.</Text>
      </View>

      </View>
            </ScrollView>
  );
};

export default ProfileScreen;
