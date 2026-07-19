import React from "react";
import { Pressable, Text, View } from "react-native";

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
  icon = "⏰",
  title,
  subtitle,
  amount,
  amountColor = "text-red-600",
  onSnooze,
  onPay,
}: ReminderItemProps) => {
  return (
    <View className="bg-white rounded-lg shadow-sm p-4 mb-3">
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-red-100 items-center justify-center mr-3 flex">
            <Text className="text-red-600 text-base">{icon}</Text>
          </View>
          <View>
            <Text className="font-medium">{title}</Text>
            <Text className="text-xs text-gray-500">{subtitle}</Text>
          </View>
        </View>
        <Text className={`${amountColor} font-medium`}>{amount}</Text>
      </View>
      <View className="flex-row justify-end space-x-2">
        <Pressable
          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md"
          onPress={onSnooze}
        >
          <Text className="text-sm text-gray-700">Posponer</Text>
        </Pressable>
        <Pressable className="bg-blue-600 px-3 py-1 rounded-md" onPress={onPay}>
          <Text className="text-sm text-black">Pagar ahora</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default ReminderItem;
