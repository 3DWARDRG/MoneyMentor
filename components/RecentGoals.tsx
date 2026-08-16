import { FinancialGoal } from "@/database/models/mlFinancialGoal";
import { Href, router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import GoalItem from "./GoalItem";

interface RecentGoalsProps {
  goals: FinancialGoal[];
  loading: boolean;
}

const RecentGoals = ({ goals, loading }: RecentGoalsProps) => {
  if (loading) {
    return <ActivityIndicator className="my-4" color="#58a5ff" />;
  }

  if (goals.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-center text-muted dark:text-muted-dark">No hay metas aún</Text>
      </View>
    );
  }

  const recentGoals = goals.slice(0, 5);

  return (
    <View className="mb-4">
      <View className="flex-row justify-between items-center p-3">
        <Text className="font-bold text-xl text-ink dark:text-ink-dark">Metas recientes</Text>

        <TouchableOpacity onPress={() => router.push("/(tabs)/goals" as Href)}>
          <Text className="text-accent dark:text-accent-dark font-medium">Ver todas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={recentGoals}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/goals/[id]",
                params: { id: item.id },
              })
            }
          >
            <GoalItem
              title={item.title}
              amount={item.amount}
              progress={item.progress}
              deadline={item.deadline}
              savedAmount={item.savedAmount}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default RecentGoals;
