import React from 'react';
import { View, Text } from 'react-native';

const BalanceCard = () => {
  return (
    <View className="bg-blue-600 text-white p-5 mb-6 rounded-2xl">
      <Text className="text-blue-100 mb-1">Balance total</Text>
      <Text className="text-3xl font-bold mb-4 text-white">$356,562,000.00</Text>
      <View className="flex-row justify-between">
        <View>
          <Text className="text-blue-200 text-xs">Ingresos</Text>
          <Text className="font-semibold text-white">+$3,200.00</Text>
        </View>
        <View>
          <Text className="text-blue-200 text-xs">Gastos</Text>
          <Text className="font-semibold text-white">-$1,500.00</Text>
        </View>
      </View>
    </View>
  );
};

export default BalanceCard;