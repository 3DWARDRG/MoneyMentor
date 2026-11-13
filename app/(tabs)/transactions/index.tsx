import ScreenBackdrop from "@/components/ui/ScreenBackdrop";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TxType = "income" | "expense" | "transfer";

export default function TransactionsIndexScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { transactions, loading } = useTransactions(userId ?? "");

  const formatCurrency = (amount: number) =>
    `$ ${Number(amount ?? 0).toLocaleString("es-CO")}`;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTypeLabel = (type: TxType) => {
    if (type === "income") return "Ingreso";
    if (type === "expense") return "Gasto";
    return "Transferencia";
  };

  const getAmountColor = (type: TxType) => {
    if (type === "income") return "text-income dark:text-income-dark";
    if (type === "expense") return "text-expense dark:text-expense-dark";
    return "text-accent dark:text-accent-dark";
  };

  return (
    <SafeAreaView className="flex-1">
      <ScreenBackdrop />
      <View className="flex-1 px-5 pt-4">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
            Transacciones
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/transactions/new")}
            className="bg-accent dark:bg-accent-dark px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-medium">Nueva</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted dark:text-muted-dark">
              Cargando transacciones...
            </Text>
          </View>
        ) : transactions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-lg font-semibold text-ink dark:text-ink-dark mb-2">
              Aún no hay transacciones
            </Text>
            <Text className="text-muted dark:text-muted-dark text-center mb-4">
              Crea tu primera transacción para empezar a llevar el control.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/transactions/new")}
              className="bg-accent dark:bg-accent-dark px-5 py-3 rounded-lg"
            >
              <Text className="text-white font-medium">Crear transacción</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/transactions/[id]",
                    params: { id: item.id },
                  })
                }
                className="bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 pr-3">
                    <Text
                      numberOfLines={1}
                      className="text-base font-semibold text-ink dark:text-ink-dark"
                    >
                      {item.description}
                    </Text>

                    <Text className="text-sm text-muted dark:text-muted-dark mt-1">
                      {getTypeLabel(item.type)} · {formatDate(item.date)}
                    </Text>
                  </View>

                  <Text
                    className={`text-base font-bold ${getAmountColor(item.type)}`}
                  >
                    {item.type === "expense"
                      ? `- ${formatCurrency(item.amount)}`
                      : item.type === "income"
                        ? `+ ${formatCurrency(item.amount)}`
                        : formatCurrency(item.amount)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
