import React from "react";
import { Text, View } from "react-native";

interface Props {
  totalExpense: number;
  totalIncome: number;
  totalTransfer: number;
  loading: boolean;
  periodStart: number;
  periodEnd: number;
  transactionstype: string;
}

const formatCOP = (value: number) =>
  `$${Number(value).toLocaleString("es-CO")}`;

/**
 * Etiqueta dinámica del lapso: si el rango cubre un mes completo muestra
 * "Agosto 2026"; en cualquier otro caso muestra el rango de fechas.
 */
const getRangeLabel = (start: number, end: number) => {
  const s = new Date(start);
  const e = new Date(end);
  const lastDayOfMonth = new Date(
    e.getFullYear(),
    e.getMonth() + 1,
    0,
  ).getDate();
  const isFullMonth =
    s.getDate() === 1 &&
    e.getDate() === lastDayOfMonth &&
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth();

  if (isFullMonth) {
    return s.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  return `${fmt(s)} - ${fmt(e)} ${e.getFullYear()}`;
};

/** Días que abarca el lapso (inclusive). */
const getPeriodDays = (start: number, end: number) =>
  Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

/** Días que faltan para que termine el lapso (0 si ya terminó). */
const getDaysRemaining = (end: number) => {
  const now = new Date().getTime();
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const getTypeText = (e: string) => {
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
  const label = getRangeLabel(periodStart, periodEnd);
  const daysLeft = getDaysRemaining(periodEnd);
  const periodDays = getPeriodDays(periodStart, periodEnd);

  const getTypeTransactionValue = (e: string) => {
    if (e === "expense") return formatCOP(totalExpense);
    if (e === "income") return formatCOP(totalIncome);
    if (e === "transfer") return formatCOP(totalTransfer);
    return "Error";
  };

  return (
    <View className="bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10 rounded-xl p-5 mb-5 shadow-sm">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="font-bold text-base text-ink dark:text-ink-dark">
          Resumen del período
        </Text>
        <Text className="text-sm text-muted dark:text-muted-dark capitalize">
          {label}
        </Text>
      </View>

      {loading ? (
        <Text className="text-ink dark:text-ink-dark text-center py-4">
          Cargando...
        </Text>
      ) : (
        <View className="flex-row flex-wrap justify-between gap-y-4 mt-2">
          <View className="w-[48%]">
            <Text className="text-sm text-muted dark:text-muted-dark">
              {getTypeText(transactionstype)}
            </Text>
            <Text className="font-bold text-ink dark:text-ink-dark">
              {getTypeTransactionValue(transactionstype)}
            </Text>
          </View>
          <View className="w-[48%]">
            <Text className="text-sm text-muted dark:text-muted-dark">
              Días del período
            </Text>
            <Text className="font-bold text-ink dark:text-ink-dark">
              {periodDays}
            </Text>
          </View>
          <View className="w-[48%]">
            <Text className="text-sm text-muted dark:text-muted-dark">
              {daysLeft > 0 ? "Días restantes" : "Período"}
            </Text>
            <Text className="font-bold text-ink dark:text-ink-dark">
              {daysLeft > 0 ? daysLeft : "Finalizado"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default MonthlyOverview;
