import { Transaction } from "@/database/models/mlTransaction";
import { useTransaction } from "@/hooks/useTransaction";
import { deleteTransaction } from "@/services/transactionService";
import { getScreenTitle } from "@/utils/screenUtils";
import { Stack ,  router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


// ==========================================
// 1. COMPONENTE VISUAL (Read-Only)
// ==========================================
interface TransactionDetailProps {
  transaction: Transaction;
}

const TransactionDetailScreen = ({ transaction }: TransactionDetailProps) => {
  const navigation = useNavigation();

  // Navegar al formulario de edición (new.tsx) pasándole el ID
  const handleEdit = useCallback(() => {
    router.push({
      pathname: "/transactions/new",
      params: { id: transaction.id },
    });
  }, [transaction]);

  // Botones dinámicos en el header nativo del Stack
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text className="text-accent dark:text-accent-dark font-medium">Cerrar</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleEdit} hitSlop={8}>
          <Text className="text-accent dark:text-accent-dark font-medium">Editar</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleEdit]);

  // Utilidad para formatear la fecha que ya tenías
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const selectedDate = formatLocalDate(new Date(transaction.date));

  const handleDelete = async () => {
    Alert.alert("Eliminar transacción", "Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            // Usamos tu helper existente para eliminar
            await deleteTransaction(transaction.id);
            router.back();
          } catch (error: any) {
            Alert.alert("Error", error.message || "No se pudo eliminar");
          }
        },
      },
    ]);
  };

  // Diccionario simple para traducir los tipos visualmente (Opcional)
  const txTypeLabels: Record<string, string> = {
    income: "Ingreso",
    expense: "Gasto",
    transfer: "Transferencia",
  };

  return (
    <SafeAreaView
      className="flex-1 bg-deep dark:bg-deep-dark"
      edges={["bottom", "left", "right"]}
    >
      <ScrollView className="flex-1 p-5">
        {/* CONTENIDO READ-ONLY */}
        <View className="gap-4">
          <View className="p-4 rounded-xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10">
            <Text className="text-xs text-muted dark:text-muted-dark">Tipo</Text>
            <Text className="text-base font-semibold text-ink dark:text-ink-dark capitalize">
              {txTypeLabels[transaction.type] || transaction.type}
            </Text>
          </View>

          <View className="p-4 rounded-xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10">
            <Text className="text-xs text-muted dark:text-muted-dark">Monto</Text>
            <Text className="text-base font-semibold text-ink dark:text-ink-dark">
              ${Number(transaction.amount ?? 0).toLocaleString("es-CO")}
            </Text>
          </View>

          <View className="p-4 rounded-xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10">
            <Text className="text-xs text-muted dark:text-muted-dark">Descripción</Text>
            <Text className="text-base font-semibold text-ink dark:text-ink-dark">
              {transaction.description || "Sin descripción"}
            </Text>
          </View>

          <View className="p-4 rounded-xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10">
            <Text className="text-xs text-muted dark:text-muted-dark">Fecha</Text>
            <Text className="text-base font-semibold text-ink dark:text-ink-dark">
              {selectedDate}
            </Text>
          </View>

          {/* BOTONES DE ACCIÓN */}
          <View className="pt-6">
            <TouchableOpacity
              className="bg-expense/10 dark:bg-expense-dark/10 border border-expense/20 dark:border-expense-dark/20 py-4 rounded-lg items-center"
              onPress={handleDelete}
            >
              <Text className="text-expense dark:text-expense-dark font-medium text-base">
                Eliminar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ==========================================
// 2. WRAPPER PRINCIPAL (suscripción manual)
// ==========================================
export default function TransactionDetailWrapper() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const title = getScreenTitle("transactions", "details");
  const { transaction, loading } = useTransaction(id);

  // Si no hay ID o si Expo Router está inicializando, protegemos la vista
  if (!id) return null;

  if (loading || !transaction) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-deep dark:bg-deep-dark"
        edges={["bottom", "left", "right"]}
      >
        <Stack.Screen 
        options={{ 
          title,
          headerTitleAlign: "center"
        }} 
      />
        <ActivityIndicator size="large" color="#4b9aff" />
      </SafeAreaView>
    );
  }

  return <TransactionDetailScreen transaction={transaction} />;
}
