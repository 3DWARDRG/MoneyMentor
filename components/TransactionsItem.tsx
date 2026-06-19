import React from "react";
import { Text, View } from "react-native";

interface TransactionItemProps {
  description: string;
  date: number; // timestamp Unix
  amount: number;
  categoryId: string;
  type: "income" | "expense";
}

const TransactionItem = ({
  description,
  date,
  amount,
  categoryId,
  type,
}: TransactionItemProps) => {
  const isIncome = type === "income";

  // Formatear moneda a COP (o cualquier otra)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(value);
  };

  // Formatear fecha
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

  // Definir ícono según tipo (puedes cambiarlo)
  const icon = isIncome ? "💰" : "💸";
  const bgColor = isIncome ? "bg-green-100" : "bg-red-100";
  const iconColor = isIncome ? "text-green-600" : "text-red-600";
  const amountColor = isIncome ? "text-green-600" : "text-red-600";
  const amountPrefix = isIncome ? "+" : "-";

  return (
    <View className="flex-row items-center p-3 border-b border-gray-200">
      <View
        className={`h-10 w-10 rounded-full ${bgColor} items-center justify-center mr-3`}
      >
        <Text className={`${iconColor} font-bold text-base`}>{icon}</Text>
      </View>
      <View className="flex-grow">
        <Text className="font-medium text-base">
          {description || "Sin descripción"}
        </Text>
        <Text className="text-gray-500 text-sm">{formatDate(date)}</Text>
      </View>
      <Text className={`${amountColor} font-medium`}>
        {amountPrefix}
        {formatCurrency(amount)}
      </Text>
    </View>
  );
};

export default TransactionItem;
