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
    <View className="bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10 rounded-xl p-5 mb-5 shadow-sm">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="font-bold text-base text-ink dark:text-ink-dark">Resumen del período</Text>
        <Text className="text-sm text-muted dark:text-muted-dark capitalize">{label}</Text>
      </View>

      {loading ? (
        <Text className="text-ink dark:text-ink-dark text-center py-4">Cargando...</Text>
      ) : (
        <View className="flex-row flex-wrap justify-between gap-y-4 mt-2">
          <View className="w-[48%]">
            <Text className="text-sm text-muted dark:text-muted-dark">{getTypeText(transactionstype)}</Text>
            <Text className="font-bold text-ink dark:text-ink-dark">{getTypeTransactionValue(transactionstype)}</Text>
          </View>
          <View className="w-[48%]">

            <Text className="text-sm text-muted dark:text-muted-dark">Días restantes</Text>
            <Text className="font-bold text-ink dark:text-ink-dark">{daysLeft}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default MonthlyOverview;
