import { database } from "@/database";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

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
        <Text className="font-bold text-xl">Transacciones recientes</Text>

        <TouchableOpacity onPress={() => router.push("/(tabs)/transactions")}>
          <Text className="text-blue-600 font-medium">Ver todas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={recentTransactions}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(tabs)/transactions/[id]",
                params: { id: item.id },
              })
            }
          >
            <TransactionItem
              description={item.description}
              categoryName={
                categoryMap[item.categoryId ?? ""]?.name ?? "Sin categoría"
              }
              categoryIcon={categoryMap[item.categoryId ?? ""]?.icon ?? "📁"}
              date={item.date}
              amount={item.amount}
              type={item.type}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default RecentTransactions;
