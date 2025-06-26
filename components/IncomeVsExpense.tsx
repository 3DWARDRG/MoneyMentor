import React from 'react';
import { View, Text } from 'react-native';

interface IncomeVsExpenseProps {
  income: number;
  expense: number;
}

const IncomeVsExpense: React.FC<IncomeVsExpenseProps> = ({ income, expense }) => {
  const total = income + expense;
  const incomePercentage = total > 0 ? (income / total) * 100 : 0;

  return (
    <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="font-bold text-base">Ingresos vs Gastos</Text>
      </View>

      {/* Progress Bar */}
      <View className="flex items-center mb-4">
        <View className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <View
            className="bg-green-500 h-4"
            style={{ width: `${incomePercentage}%` }}
          />
        </View>
      </View>

      {/* Legend and Amounts */}
      <View className="flex-row justify-between">
        {/* Ingresos */}
        <View>
          <View className="flex-row items-center mb-1">
            <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <Text className="text-sm font-medium">Ingresos</Text>
          </View>
          <Text className="font-bold">${income.toLocaleString('en-US')}</Text>
        </View>

        {/* Gastos */}
        <View className="items-end">
          <View className="flex-row items-center mb-1">
            <View className="w-3 h-3 bg-red-500 rounded-full mr-2" />
            <Text className="text-sm font-medium">Gastos</Text>
          </View>
          <Text className="font-bold">${expense.toLocaleString('en-US')}</Text>
        </View>
      </View>
    </View>
  );
};

export default IncomeVsExpense;
