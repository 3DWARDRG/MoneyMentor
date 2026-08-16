import { database } from "@/database";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function DebugDB({ onRefresh }: { onRefresh?: () => void }) {
  const { userId } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // También podemos usar el hook para ver qué dice
  const { summary, loading: summaryLoading } = useFinanceData(userId || "");

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const txCol = database.get("transactions");
      const allTx = await txCol.query().fetch();
      setTransactions(allTx);

      const catCol = database.get("categories");
      const allCats = await catCol.query().fetch();
      setCategories(allCats);

      console.log(
        `🔍 DebugDB: ${allTx.length} transacciones, ${allCats.length} categorías`,
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    console.log("🔄 Botón de refresco manual presionado");
    setRefreshCount((prev) => prev + 1);
    await loadData();
    if (onRefresh) onRefresh();
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  if (loading && transactions.length === 0) {
    return <Text className="p-2">Cargando debug...</Text>;
  }

  return (
    <View className="p-2 bg-panel dark:bg-panel-dark mb-4 border border-black/10 dark:border-white/10 rounded-lg">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-bold text-lg text-ink dark:text-ink-dark">🔍 Debug DB</Text>
        <TouchableOpacity
          onPress={handleManualRefresh}
          className="bg-accent dark:bg-accent-dark px-4 py-1 rounded-full"
        >
          <Text className="text-white font-bold">
            Refrescar ({refreshCount})
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-sm text-muted dark:text-muted-dark">Usuario ID: {userId}</Text>
      <Text className="text-sm text-muted dark:text-muted-dark">
        Refresh manual: {refreshCount}
      </Text>
      <Text className="text-sm text-muted dark:text-muted-dark">
        Balance (del hook):{" "}
        {summaryLoading ? "cargando..." : `$${summary.balance}`}
      </Text>

      <Text className="font-bold mt-2 text-ink dark:text-ink-dark">
        📊 Transacciones ({transactions.length})
      </Text>
      {transactions.length === 0 && (
        <Text className="text-muted dark:text-muted-dark">No hay transacciones</Text>
      )}
      {transactions.map((tx) => (
        <View key={tx.id} className="bg-deepSoft dark:bg-deepSoft-dark p-2 mb-1 rounded border border-black/10 dark:border-white/10">
          <Text className="text-ink dark:text-ink-dark">
            💰 {tx.description} - ${tx.amount} ({tx.type})
          </Text>
          <Text className="text-xs text-muted dark:text-muted-dark">
            Fecha: {new Date(tx.date).toLocaleDateString()}
          </Text>
        </View>
      ))}

      <Text className="font-bold mt-2 text-ink dark:text-ink-dark">
        📂 Categorías ({categories.length})
      </Text>
      {categories.slice(0, 5).map((cat) => (
        <View key={cat.id} className="bg-deepSoft dark:bg-deepSoft-dark p-1 mb-1 rounded flex-row border border-black/10 dark:border-white/10">
          <Text className="text-ink dark:text-ink-dark">
            {cat.iconImage} {cat.name} ({cat.type})
          </Text>
        </View>
      ))}
    </View>
  );
}
