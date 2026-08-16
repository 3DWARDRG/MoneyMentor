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
    <View className="bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10 rounded-xl p-5 mb-5 shadow-sm">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="font-bold text-base text-ink dark:text-ink-dark">Ingresos vs Gastos</Text>
      </View>

      {/* Progress Bar */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="w-full bg-expense dark:bg-expense-dark rounded-full h-4 overflow-hidden" >
          <View
            className="bg-income dark:bg-income-dark h-4"
            style={{ width: `${incomePercentage}%` }}
            
          />
        </View>
      </View>

      {/* Legend and Amounts */}
      <View className="flex-row justify-between">
        {/* Ingresos */}
        <View>
          <View className="flex-row items-center mb-1">
            <View className="w-3 h-3 bg-income dark:bg-income-dark rounded-full mr-2" />
            <Text className="text-sm font-medium text-ink dark:text-ink-dark">Ingresos</Text>
          </View>
          <Text className="font-bold text-ink dark:text-ink-dark">${income.toLocaleString('es-CO')}</Text>
        </View>

        {/* Gastos */}
        <View className="items-end">
          <View className="flex-row items-center mb-1">
            <View className="w-3 h-3 bg-expense dark:bg-expense-dark rounded-full mr-2" />
            <Text className="text-sm font-medium text-ink dark:text-ink-dark">Gastos</Text>
          </View>
          <Text className="font-bold text-ink dark:text-ink-dark">${expense.toLocaleString('es-CO')}</Text>
        </View>
      </View>
    </View>
) : null)}


export default IncomeVsExpense;
