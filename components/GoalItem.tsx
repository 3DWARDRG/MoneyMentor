import React from "react";
import { Text, View } from "react-native";
import PremiumIcon from "./ui/PremiumIcon";

interface GoalItemProps {
  title: string;
  amount: number;
  progress: number | null;
  deadline: number;
  savedAmount?: number;
}

const GoalItem = ({
  title,
  amount,
  progress,
  deadline,
  savedAmount,
}: GoalItemProps) => {
  const percent = progress ?? 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(value);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return "Hoy";
    if (d.toDateString() === tomorrow.toDateString()) return "Mañana";
    return d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <View className="flex-row items-center p-3 border-b border-black/10 dark:border-white/10">
      <View className="h-10 w-10 rounded-full bg-accent/15 dark:bg-accent-dark/15 items-center justify-center mr-3">
        <PremiumIcon token="goal" size={34} fallback="🎯" />
      </View>

      <View className="flex-grow">
        <Text className="font-medium text-base text-ink dark:text-ink-dark">
          {title || "Sin título"}
        </Text>
        <Text className="text-muted dark:text-muted-dark text-sm">
          {percent}% completada · {formatDate(deadline)}
        </Text>
        <View className="mt-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <View
            className="h-full rounded-full bg-accent dark:bg-accent-dark"
            style={{ width: `${percent}%` }}
          />
        </View>
        {typeof savedAmount === "number" && savedAmount > 0 ? (
          <Text className="text-muted/70 dark:text-muted-dark/70 text-xs mt-1">
            Ahorrado: {formatCurrency(savedAmount)}
          </Text>
        ) : null}
      </View>

      <Text className="text-accent dark:text-accent-dark font-medium ml-3">
        {formatCurrency(amount)}
      </Text>
    </View>
  );
};

export default GoalItem;
