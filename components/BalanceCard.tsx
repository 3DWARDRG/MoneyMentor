import React from 'react';
import { View, Text } from 'react-native';

const BalanceCard = () => {
  return (
    <View className="bg-neutral-950 text-white p-5 mb-6 rounded-2xl h-60">
      <Text className="text-black mb-4 text-2xl font-semibold bg-white rounded-md">Balance total</Text>
      <Text className="text-3xl font-bold mb-4 text-white">$356,562,000.00</Text>
      <View className="flex-row justify-between">
        <View>
          <Text className="text-green-200 text-xl text-center">Ingresos</Text>
          <Text className="font-semibold text-white text-lg my-2">+$3,200.00</Text>
        </View>
        <View>
          <Text className="text-red-200 text-xl text-center">Gastos</Text>
          <Text className="font-semibold text-white text-lg my-2">-$1,500.00</Text>
        </View>
      </View>
    </View>
  );
};

export default BalanceCard;