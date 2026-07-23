import React from 'react';
import { View, Text } from 'react-native';

interface IncomeVsExpenseProps {
  income: number;
  expense: number;
  typeTransaction: string
}

const IncomeVsExpense: React.FC<IncomeVsExpenseProps> = ({ income, expense , typeTransaction }) => {
  const total = income + expense;
  console.log("incomevsexpense" + income)
  const incomePercentage = total > 0 ? (income / total) * 100 : 0;

  return (
    typeTransaction !== "transfer" ? (
    <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="font-bold text-base text-black">Ingresos vs Gastos</Text>
      </View>

      {/* Progress Bar */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="w-full bg-red-500 rounded-full h-4 overflow-hidden" >
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
            <Text className="text-sm font-medium text-black">Ingresos</Text>
          </View>
          <Text className="font-bold text-black">${income.toLocaleString('es-CO')}</Text>
        </View>

        {/* Gastos */}
        <View className="items-end">
          <View className="flex-row items-center mb-1">
            <View className="w-3 h-3 bg-red-500 rounded-full mr-2" />
            <Text className="text-sm font-medium text-black">Gastos</Text>
          </View>
          <Text className="font-bold text-black">${expense.toLocaleString('es-CO')}</Text>
        </View>
      </View>
    </View>
) : null)}


export default IncomeVsExpense;
