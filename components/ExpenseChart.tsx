import React, { useEffect , useState } from "react";
import { Text, View } from "react-native";
import ExpenseBar from "./ExpenseBar";
import { database } from "@/database";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";

interface Props {
  expenseByCategory: Record<string, number>;
  loading: boolean;
  categoryMap?: Record<string, { name: string; icon: string }>;
  typeTransaction: string
}

const COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-red-500",
  "bg-indigo-500",
];

const formatCOP = (value: number) =>
  `$${Number(value).toLocaleString("es-CO")}`;

const ExpenseChart = ({
  expenseByCategory, typeTransaction
}: Props) => {
  const entries = Object.entries(expenseByCategory).sort(
    ([, a], [, b]) => b - a,
  );

  console.log("EXPENSE CHART",expenseByCategory)
  const maxAmount = Math.max(...entries.map(([, v]) => v), 1);

    const { userId } = useAuthStore();
    const { transactions, loading } = useFinanceData(userId || "");
  
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


  if (loading) {
    return (
      <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
        <Text className="text-black text-center py-4">Cargando...</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
        <Text className="font-bold text-base mb-2 text-black">{`${typeTransaction} por categoría`}</Text>
        <Text className="text-black text-center py-4">
          {`No hay ${typeTransaction} en este período`}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
      <Text className="font-bold text-base mb-4 text-black">{`${typeTransaction} por categoría`}</Text>

      <View className="flex-row items-end h-40 space-x-2 mb-4">
        {entries.slice(0, 6).map(([categoryId, amount], index) => {
          const heightPct = Math.round((amount / maxAmount) * 100);
          return (
            <ExpenseBar
              key={categoryId}
              color={COLORS[index % COLORS.length]}
              heightPercentage={heightPct}
              label={categoryMap[categoryId]?.name ?? "Otro"}
            />
          );
        })}
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-2">
        {entries.slice(0, 6).map(([categoryId, amount], index) => (
          <View key={categoryId} className="flex-row items-center w-[48%]">
            <View
              className={`w-3 h-3 ${COLORS[index % COLORS.length]} rounded-full mr-2`}
            />
            <Text className="text-xs text-black">
              {categoryMap[categoryId]?.name ?? "Otro"}: {formatCOP(amount)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default ExpenseChart;
