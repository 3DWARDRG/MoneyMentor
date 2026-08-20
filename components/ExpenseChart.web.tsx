import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import ReactECharts from "echarts-for-react/lib/core";
import { database } from "@/database";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";
import { echarts } from "./echarts.web";
import {
  CHART_PALETTE,
  buildExpenseChartOption,
  formatCOP,
  type TopEntry,
} from "./charts/echartsOptions";

interface Props {
  expenseByCategory: Record<string, number>;
  loading: boolean;
  categoryMap?: Record<string, { name: string; icon: string }>;
  typeTransaction: string;
}

const MAX_BARS = 6;

const ExpenseChart = ({ expenseByCategory, typeTransaction }: Props) => {
  const { userId } = useAuthStore();
  const { loading } = useFinanceData(userId || "");

  const [categoryMap, setCategoryMap] = useState<
    Record<string, { name: string; icon: string }>
  >({});

  useEffect(() => {
    const loadCategoryMap = async () => {
      if (!userId) {
        setCategoryMap({});
        return;
      }

      try {
        const catsCollection = database.get("categories");
        const cats = await catsCollection
          .query(Q.where("user_id", userId))
          .fetch();

        const map: Record<string, { name: string; icon: string }> = {};

        cats.forEach((c: any) => {
          map[c.id] = {
            name: c.name,
            icon: c.iconImage || "📁",
          };
        });

        setCategoryMap(map);
      } catch (error) {
        console.error("❌ Error cargando categoryMap:", error);
        setCategoryMap({});
      }
    };

    loadCategoryMap();
  }, [userId]);

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
      <View className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-5">
        <Text className="text-slate-300 text-center py-4">Cargando...</Text>
      </View>
    );
  }

  if (topEntries.length === 0) {
    return (
      <View className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-5">
        <Text className="font-bold text-base mb-2 text-slate-100">{`${typeTransaction} por categoría`}</Text>
        <Text className="text-slate-400 text-center py-4">
          {`No hay ${typeTransaction} en este período`}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-5">
      <Text className="font-bold text-base mb-2 text-slate-100">{`${typeTransaction} por categoría`}</Text>

      <View className="w-full h-56">
        <ReactECharts
          echarts={echarts}
          option={option}
          style={{ width: "100%", height: "100%" }}
          notMerge
        />
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-2 mt-4">
        {topEntries.map((entry, index) => (
          <View key={entry.id} className="flex-row items-center w-[48%]">
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{
                backgroundColor:
                  CHART_PALETTE[index % CHART_PALETTE.length],
              }}
            />
            <Text className="text-xs text-slate-300">
              {entry.name}: {formatCOP(entry.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default ExpenseChart;
