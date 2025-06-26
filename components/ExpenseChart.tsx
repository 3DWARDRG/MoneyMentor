import React from 'react';
import { View, Text } from 'react-native';
import ExpenseBar from './ExpenseBar';

const expenseData = [
  { label: 'Comida', color: 'bg-blue-500', height: 60, value: '$540' },
  { label: 'Trans.', color: 'bg-green-500', height: 40, value: '$360' },
  { label: 'Hogar', color: 'bg-purple-500', height: 75, value: '$675' },
  { label: 'Ocio', color: 'bg-amber-500', height: 25, value: '$225' },
  { label: 'Salud', color: 'bg-red-500', height: 50, value: '$450' },
  { label: 'Otros', color: 'bg-indigo-500', height: 30, value: '$270' },
];

const ExpenseChart: React.FC = () => {
  return (
    <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="font-bold text-base">Gastos por categoría</Text>
      </View>

      <View className="flex-row items-end h-40 space-x-2 mb-4">
        {expenseData.map((item) => (
          <ExpenseBar
            key={item.label}
            color={item.color}
            heightPercentage={item.height}
            label={item.label}
          />
        ))}
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-2">
        {expenseData.map((item) => (
          <View key={item.label} className="flex-row items-center w-[48%]">
            <View className={`w-3 h-3 ${item.color} rounded-full mr-2`} />
            <Text className="text-xs">{`${item.label}: ${item.value}`}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default ExpenseChart;
