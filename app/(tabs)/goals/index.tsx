import GoalItem from "@/components/GoalItem";
import CardBackdrop from "@/components/ui/CardBackdrop";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";
import { useGoals } from "@/hooks/useGoals";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { useEffect } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
  }).format(value);

export default function GoalsIndexScreen() {
  const { userId } = useAuthStore();
  const { goals, loading, summary } = useGoals(userId ?? "");

  useEffect(() => {
    console.log("🔍 GoalsIndex userId:", userId);
    console.log("🔍 GoalsIndex loading:", loading);
    console.log("🔍 GoalsIndex metas:", goals.length, "| summary:", summary);
    if (goals.length > 0) {
      console.log("🔍 Primera meta:", goals[0].id, goals[0].title, goals[0].amount);
    }
  }, [userId, loading, goals, summary]);

  return (
    <SafeAreaView className="flex-1">
      <ScreenBackdrop />
      <View className="flex-1 px-5 pt-4">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Mis Metas</Text>

          <TouchableOpacity
            onPress={() => router.push("/goals/new")}
            className="bg-accent dark:bg-accent-dark px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-medium">Nueva</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted dark:text-muted-dark">Cargando metas...</Text>
          </View>
        ) : goals.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-lg font-semibold text-ink dark:text-ink-dark mb-2">
              Aún no hay metas
            </Text>
            <Text className="text-muted dark:text-muted-dark text-center mb-4">
              Crea tu primera meta para empezar a ahorrar con propósito.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/goals/new")}
              className="bg-accent dark:bg-accent-dark px-5 py-3 rounded-lg"
            >
              <Text className="text-white font-medium">Crear meta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={goals}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListHeaderComponent={
              <View className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 mb-4">
                <CardBackdrop glowColor="#1d7df0" glowOpacity={0.16} glowSize={240} glowTop={-100} glowRight={-80} />
                <View className="p-5">
                  <Text className="mb-4 text-xl font-semibold bg-black/5 dark:bg-white/10 text-ink dark:text-ink-dark rounded-md p-1 text-center">
                    Resumen de metas
                  </Text>
                  <Text className="text-3xl font-bold text-ink dark:text-ink-dark text-center mb-4">
                    {formatCOP(summary.totalAmount)}
                  </Text>
                  <View className="flex-row justify-between">
                    <View>
                      <Text className="text-income dark:text-income-dark text-xl text-center">
                        Completadas
                      </Text>
                      <Text className="font-semibold text-ink dark:text-ink-dark text-lg my-2 text-center">
                        {summary.completedGoals}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-ink dark:text-ink-dark text-xl text-center">
                        Total
                      </Text>
                      <Text className="font-semibold text-ink dark:text-ink-dark text-lg my-2 text-center">
                        {summary.totalGoals}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/goals/[id]",
                    params: { id: item.id },
                  })
                }
                className="bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10 rounded-2xl mb-3 overflow-hidden"
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
        )}
      </View>
    </SafeAreaView>
  );
}
