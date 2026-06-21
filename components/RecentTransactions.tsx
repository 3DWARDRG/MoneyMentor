import { database } from "@/database";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import TransactionItem from "../components/TransactionsItem";

const RecentTransactions = () => {
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
        console.log(
  cats.map((c: any) => ({
    id: c.id,
    name: c.name,
    iconImage: c.iconImage,
  }))
);

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
    return <ActivityIndicator className="my-4" />;
  }

  if (transactions.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-center text-gray-500">
          No hay transacciones aún
        </Text>
      </View>
    );
  }

  

  return (
    <View className="mb-4">
      <View className="flex-row justify-between items-center p-3">
        <Text className="font-bold text-xl">Transacciones</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            description={item.description}
            categoryName={
              categoryMap[item.category_id]?.name ?? "Sin categoría"
            }
            categoryIcon={categoryMap[item.category_id]?.icon ?? "📁"}
            date={item.date}
            amount={item.amount}
            type={item.type}
          />
        )}
      />
    </View>
  );
};

export default RecentTransactions;
