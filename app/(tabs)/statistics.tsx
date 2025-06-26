import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatistisHeader from '@/components/StatisticsHeader';
import MonthlyOverview from '@/components/MonthlyOverview';
import ExpenseChart from '@/components/ExpenseChart';
import IncomeVsExpense from '@/components/IncomeVsExpense';


export default function Statistics() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4">
          <StatistisHeader />
          <MonthlyOverview />
          <ExpenseChart />
          <IncomeVsExpense income={3200} expense={1800} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
