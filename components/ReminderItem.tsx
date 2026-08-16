import React from "react";
import { Pressable, Text, View } from "react-native";
import PremiumIcon from "./ui/PremiumIcon";

interface ReminderItemProps {
  icon?: string;
  title: string;
  subtitle: string;
  amount: string;
  amountColor?: string;
  onSnooze?: () => void;
  onPay?: () => void;
}

const ReminderItem = ({
  icon = "subscription",
  title,
  subtitle,
  amount,
  amountColor = "text-expense dark:text-expense-dark",
  onSnooze,
  onPay,
}: ReminderItemProps) => {
  return (
    <View className="bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10 rounded-lg shadow-sm p-4 mb-3">
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-expense/10 dark:bg-expense-dark/10 items-center justify-center mr-3 flex">
            <PremiumIcon token={icon} size={34} fallback="⏰" />
          </View>
          <View>
            <Text className="font-medium text-ink dark:text-ink-dark">{title}</Text>
            <Text className="text-xs text-muted dark:text-muted-dark">{subtitle}</Text>
          </View>
        </View>
        <Text className={`${amountColor} font-medium`}>{amount}</Text>
      </View>
      <View className="flex-row justify-end space-x-2">
        <Pressable
          className="bg-black/5 dark:bg-white/10 px-3 py-1 rounded-md"
          onPress={onSnooze}
        >
          <Text className="text-sm text-muted dark:text-muted-dark">Posponer</Text>
        </Pressable>
        <Pressable className="bg-accent dark:bg-accent-dark px-3 py-1 rounded-md" onPress={onPay}>
          <Text className="text-sm text-white">Pagar ahora</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default ReminderItem;
