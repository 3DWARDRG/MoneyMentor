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
    <View className="p-2 bg-gray-100 mb-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-bold text-lg">🔍 Debug DB</Text>
        <TouchableOpacity
          onPress={handleManualRefresh}
          className="bg-blue-500 px-4 py-1 rounded-full"
        >
          <Text className="text-white font-bold">
            Refrescar ({refreshCount})
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-sm text-gray-600">Usuario ID: {userId}</Text>
      <Text className="text-sm text-gray-600">
        Refresh manual: {refreshCount}
      </Text>
      <Text className="text-sm text-gray-600">
        Balance (del hook):{" "}
        {summaryLoading ? "cargando..." : `$${summary.balance}`}
      </Text>

      <Text className="font-bold mt-2">
        📊 Transacciones ({transactions.length})
      </Text>
      {transactions.length === 0 && (
        <Text className="text-gray-400">No hay transacciones</Text>
      )}
      {transactions.map((tx) => (
        <View key={tx.id} className="bg-white p-2 mb-1 rounded">
          <Text>
            💰 {tx.description} - ${tx.amount} ({tx.type})
          </Text>
          <Text className="text-xs text-gray-500">
            Fecha: {new Date(tx.date).toLocaleDateString()}
          </Text>
        </View>
      ))}

      <Text className="font-bold mt-2">
        📂 Categorías ({categories.length})
      </Text>
      {categories.slice(0, 5).map((cat) => (
        <View key={cat.id} className="bg-white p-1 mb-1 rounded flex-row">
          <Text>
            {cat.icon_image} {cat.name} ({cat.type})
          </Text>
        </View>
      ))}
    </View>
  );
}
