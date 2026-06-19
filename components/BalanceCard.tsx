import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuthStore } from "@/store/useAuthStore";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

const BalanceCard = () => {
  const { userId } = useAuthStore();
  const { summary, loading } = useFinanceData(userId || "");

  if (loading || !userId) {
    return (
      <View className="bg-neutral-950 p-5 rounded-2xl h-60 items-center justify-center">
        <ActivityIndicator color="white" />
      </View>
    );
  }

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(value);
  };

  return (
    <View className="bg-neutral-950 p-5 mb-6 rounded-2xl h-60">
      <Text className="text-black mb-4 text-2xl font-semibold bg-white rounded-md p-1 text-center">
        Balance total
      </Text>
      <Text className="text-3xl font-bold mb-4 text-white text-center">
        {formatCOP(summary.balance)}
      </Text>
      <View className="flex-row justify-between">
        <View>
          <Text className="text-green-200 text-xl text-center">Ingresos</Text>
          <Text className="font-semibold text-white text-lg my-2">
            +{formatCOP(summary.income)}
          </Text>
        </View>
        <View>
          <Text className="text-red-200 text-xl text-center">Gastos</Text>
          <Text className="font-semibold text-white text-lg my-2">
            -{formatCOP(summary.expense)}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default BalanceCard;
