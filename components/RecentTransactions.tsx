import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import TransactionItem from "../components/TransactionsItem"; // asumo que existe

const RecentTransactions = () => {
  const { userId } = useAuthStore();
  const { transactions, loading } = useFinanceData(userId || "");
  const recent = transactions.slice(0, 5);

  if (loading) {
    return <ActivityIndicator className="my-4" />;
  }

  if (recent.length === 0) {
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
        <Pressable onPress={() => router.push("/")}>
          <Text className="text-blue-600 text-base">Ver todas</Text>
        </Pressable>
      </View>
      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            description={item.description}
            categoryId={item.category_id}
            date={item.date}
            amount={item.amount}
            type={item.type}
          />
        )}
        scrollEnabled={false}
      />
    </View>
  );
};

export default RecentTransactions;
