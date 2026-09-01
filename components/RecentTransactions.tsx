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
import CardBackdrop from "./ui/CardBackdrop";

const RecentTransactions = ({ accountId }: { accountId?: string | null }) => {
  const userId = useAuthStore((s) => s.userId);
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
    const filtered = accountId
      ? transactions.filter(
          (tx) =>
            tx.accountId === accountId || tx.destinationAccountId === accountId,
        )
      : transactions;
    return filtered.slice(0, 5);
  }, [transactions, accountId]);

  if (loading) {
    return <ActivityIndicator className="my-4" color="#58a5ff" />;
  }

  if (transactions.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-center text-muted dark:text-muted-dark">
          No hay transacciones aún
        </Text>
      </View>
    );
  }

  if (recentTransactions.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-center text-muted dark:text-muted-dark">
          No hay transacciones para esta cuenta
        </Text>
      </View>
    );
  }

  return (
    <View className="mb-4 rounded-3xl overflow-hidden border border-black/10 dark:border-white/15">
      <CardBackdrop
        glowColor="#1d7df0"
        glowOpacity={0.12}
        glowSize={200}
        glowTop={-80}
        glowRight={-60}
      />
      <View className="p-3">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="font-bold text-base text-ink dark:text-ink-dark">
            Transacciones recientes
          </Text>

          <TouchableOpacity onPress={() => router.push("/(tabs)/transactions")}>
            <Text className="text-accent dark:text-accent-dark font-medium text-sm">
              Ver todas
            </Text>
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
                  pathname: "/transactions/[id]",
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
    </View>
  );
};

export default RecentTransactions;
