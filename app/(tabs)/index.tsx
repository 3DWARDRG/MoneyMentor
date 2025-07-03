import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Image, ImageBackground } from 'react-native';
import BalanceCard from '@/components/BalanceCard';
import RecentTransactions from '@/components/RecentTransactions';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function Index() {
  return (
    <SafeAreaView className='bg-gray-50 flex-1'>
      <View className='flex-1 box-border bg-white p-4'>
        <View className='min-h-10'>     
           <View
        className="p-4"
      >
     <View className="flex-row justify-between items-center mb-6">
      <View>
        <Text className="text-2xl font-bold">Hola, Edward</Text>
        <Text className="text-gray-950">Bienvenido de nuevo</Text>
      </View>
          <View className="min-w-20 h-20 rounded-full overflow-hidden">
            <Image
              source={{
                uri: 'https://img.freepik.com/vector-premium/icono-circulo-usuario-anonimo-ilustracion-vector-estilo-plano-sombra_520826-1931.jpg',
              }}
              className="w-full h-full"
            />
          </View>
    </View>
        <BalanceCard />
      </View>
      </View>
<View className='min-h-40 '>
<RecentTransactions />
<TouchableOpacity onPress={() => router.push('/register')}>
  <Text className="text-blue-600">Regístrate aquí</Text>
</TouchableOpacity>

</View>
</View>
    </SafeAreaView>
  );
}
