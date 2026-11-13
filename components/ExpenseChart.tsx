import { useCategories } from "@/hooks/useCategories";
import { useAuthStore } from "@/store/useAuthStore";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import {
  buildExpenseChartOption,
  type TopEntry,
} from "./charts/echartsOptions";
import EChartsWebView from "./charts/EChartsWebView";

interface Props {
  expenseByCategory: Record<string, number>;
  loading: boolean;
  categoryMap?: Record<string, { name: string; icon: string }>;
  typeTransaction: string;
}

const MAX_BARS = 6;
const CHART_HEIGHT = 324;

const ExpenseChart = ({ expenseByCategory, typeTransaction, loading }: Props) => {
  const userId = useAuthStore((s) => s.userId);
  const { categories } = useCategories(userId || "");

  const categoryMap = useMemo(() => {
    const map: Record<string, { name: string; icon: string }> = {};
    for (const c of categories) {
      map[c.id] = { name: c.name, icon: c.iconImage || "📁" };
    }
    return map;
  }, [categories]);

  const entries = useMemo(
    () => Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a),
    [expenseByCategory],
  );

  const topEntries = useMemo<TopEntry[]>(
    () =>
      entries.slice(0, MAX_BARS).map(([id, value]) => ({
        id,
        name: categoryMap[id]?.name ?? "Otro",
        value,
      })),
    [entries, categoryMap],
  );

  const option = useMemo(
    () => buildExpenseChartOption(topEntries, typeTransaction),
    [topEntries, typeTransaction],
  );

  if (loading) {
    return (
      <View className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 mb-5">
        <Text className="text-slate-300 text-center py-4">Cargando...</Text>
      </View>
    );
  }

  if (topEntries.length === 0) {
    return (
      <View className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 mb-5">
        <Text className="font-bold text-base mb-2 text-slate-100">{`${typeTransaction} por categoría`}</Text>
        <Text className="text-slate-400 text-center py-4">
          {`No hay ${typeTransaction} en este período`}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 mb-5">
      <Text className="font-bold text-base mb-2 text-slate-100">{`${typeTransaction} por categoría`}</Text>

      <EChartsWebView option={option} height={CHART_HEIGHT} />
    </View>
  );
};

export default ExpenseChart;
