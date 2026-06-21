import React from "react";
import { Text, View } from "react-native";

interface TransactionItemProps {
  description: string;
  categoryName: string;
  categoryIcon: string;
  date: number;
  amount: number;
  type: "income" | "expense";
}

const TransactionItem = ({
  description,
  categoryName,
  categoryIcon,
  date,
  amount,
  type,
}: TransactionItemProps) => {
  const isIncome = type === "income";
  const bgColor = isIncome ? "bg-green-100" : "bg-red-100";
  const amountColor = isIncome ? "text-green-600" : "text-red-600";
  const amountPrefix = isIncome ? "+" : "-";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(value);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return `Hoy, ${d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Ayer, ${d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
    }
  };

  return (
    <View className="flex-row items-center p-3 border-b border-gray-200">
      <View
        className={`h-10 w-10 rounded-full ${bgColor} items-center justify-center mr-3`}
      >
        <Text className="text-xl">{categoryIcon || "📁"}</Text>
      </View>

      <View className="flex-grow">
        <Text className="font-medium text-base">
          {description || "Sin descripción"}
        </Text>
        <Text className="text-gray-500 text-sm">
          {categoryName || "Sin categoría"}
        </Text>
        <Text className="text-gray-400 text-xs">{formatDate(date)}</Text>
      </View>

      <Text className={`${amountColor} font-medium ml-3`}>
        {amountPrefix}
        {formatCurrency(amount)}
      </Text>
    </View>
  );
};

export default TransactionItem;
