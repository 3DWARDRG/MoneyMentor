import React from "react";
import { Text, View } from "react-native";

interface Props {
  totalExpense: number;
  totalIncome:number;
  totalTransfer:number;
  loading: boolean;
  periodStart: number;
  periodEnd: number;
  transactionstype: string
  
}

const formatCOP = (value: number) =>
  `$${Number(value).toLocaleString("es-CO")}`;

const getPeriodLabel = (start: number) => {
  const date = new Date(start);
  return date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
};

const getDaysRemaining = (end: number) => {
  const now = new Date().getTime();
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};


const getTypeText = (e : string) => {
  if (e === "expense") return "Gastados";
  if (e === "income") return "Ingresados";
  if (e === "transfer") return "Transferido";
  return "Error";
};


const MonthlyOverview = ({
  transactionstype,
  totalExpense,
  totalIncome,
  totalTransfer,
  loading,
  periodStart,
  periodEnd,
}: Props) => {
  const label = getPeriodLabel(periodStart);
  const daysLeft = getDaysRemaining(periodEnd);
const getTypeTransactionValue = (e : string) => {
  if (e === "expense") return formatCOP(totalExpense);
  if (e === "income") return formatCOP(totalIncome);
  if (e === "transfer") return formatCOP(totalTransfer);
  return "Error";
};

  return (
    <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="font-bold text-base">Resumen del período</Text>
        <Text className="text-sm text-gray-500 capitalize">{label}</Text>
      </View>

      {loading ? (
        <Text className="text-gray-400 text-center py-4">Cargando...</Text>
      ) : (
        <View className="flex-row flex-wrap justify-between gap-y-4 mt-2">
          <View className="w-[48%]">
            <Text className="text-sm text-gray-500">{getTypeText(transactionstype)}</Text>
            <Text className="font-bold">{getTypeTransactionValue(transactionstype)}</Text>
          </View>
          <View className="w-[48%]">

            <Text className="text-sm text-gray-500">Días restantes</Text>
            <Text className="font-bold">{daysLeft}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default MonthlyOverview;
