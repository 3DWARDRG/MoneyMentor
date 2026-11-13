import React from 'react';
import { View, Text } from 'react-native';

interface ExpenseBarProps {
  color: string;
  heightPercentage: number; // 0 a 100
  label: string;
}

const ExpenseBar = ({ color, heightPercentage, label }: ExpenseBarProps) => {
  return (
    <View className="flex-1 items-center">
      <View
        className={`w-full rounded-t-md ${color}`}
        style={{ height: `${heightPercentage}%` }}
      />
      <Text className="text-xs mt-1 text-muted dark:text-muted-dark">{label}</Text>
    </View>
  );
};

export default ExpenseBar;
