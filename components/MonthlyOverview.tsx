import React from 'react';
import { View, Text } from 'react-native';
import { Svg, Circle } from 'react-native-svg';

const RADIUS = 70;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PERCENT = 60;
const DASH_OFFSET = CIRCUMFERENCE * (1 - PERCENT / 100);

const MonthlyOverview = () => {
  return (
    <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="font-bold text-base">Resumen mensual</Text>
        <Text className="text-sm text-gray-500">Marzo 2023</Text>
      </View>

      {/* Progress Circle */}
      <View className="items-center justify-center mb-4">
        <View className="relative h-40 w-40">

          <View className="absolute inset-0 items-center justify-center flex">
            <Text className="text-3xl font-bold">60%</Text>
            <Text className="text-sm text-gray-500">Usado</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row flex-wrap justify-between gap-y-4">
        <View className="w-[48%]">
          <Text className="text-sm text-gray-500">Presupuesto</Text>
          <Text className="font-bold">$3,000.00</Text>
        </View>
        <View className="w-[48%]">
          <Text className="text-sm text-gray-500">Gastado</Text>
          <Text className="font-bold">$1,800.00</Text>
        </View>
        <View className="w-[48%]">
          <Text className="text-sm text-gray-500">Disponible</Text>
          <Text className="font-bold text-green-600">$1,200.00</Text>
        </View>
        <View className="w-[48%]">
          <Text className="text-sm text-gray-500">Días restantes</Text>
          <Text className="font-bold">12</Text>
        </View>
      </View>
    </View>
  );
};

export default MonthlyOverview;
