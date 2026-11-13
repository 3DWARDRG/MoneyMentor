import PremiumIcon from "@/components/ui/PremiumIcon";
import { Account } from "@/database/models/mlAccount";
import { useAccount } from "@/hooks/useAccount";
import { deleteAccount } from "@/services/accountService";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
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

// Diccionarios para mostrar los nombres bonitos en lugar de "savings" o "credit_card"
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cash: "Efectivo",
  savings: "Cuenta de Ahorros",
  checking: "Cuenta Corriente",
  credit: "Crédito",
};

interface AccountDetailProps {
  account: Account;
  onDelete: () => void;
}

const AccountDetailScreen = ({ account, onDelete }: AccountDetailProps) => {
  // Acción: confirmar y eliminar la cuenta
  const handleDelete = () => {
    Alert.alert(
      "Eliminar Cuenta",
      "¿Estás seguro? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: onDelete },
      ],
    );
  };

  return (
    <View className="flex-1 bg-deep dark:bg-deep-dark">
      <ScrollView className="flex-1 p-5">
        {/* TARJETA PRINCIPAL (SALDO) */}
        <View className="items-center bg-panel dark:bg-panel-dark rounded-3xl p-8 mb-6 border border-black/10 dark:border-white/10">
          <PremiumIcon token={account.iconImage} size={72} radius={20} fallback="🏦" />
          <Text className="text-muted dark:text-muted-dark text-sm uppercase tracking-wider font-medium mb-1">
            {account.institution || "Sin Institución"}
          </Text>
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark mb-4">
            {account.name}
          </Text>

          <View className="bg-accent/10 dark:bg-accent-dark/10 px-6 py-3 rounded-2xl">
            <Text className="text-3xl font-black text-accent dark:text-accent-dark">
              ${account.balance?.toLocaleString("es-CO")} {account.currency}
            </Text>
          </View>
        </View>

        {/* METADATOS */}
        <View className="bg-panel dark:bg-panel-dark rounded-2xl p-5 mb-8 border border-black/10 dark:border-white/10">
          <View className="flex-row justify-between py-3 border-b border-black/10 dark:border-white/10">
            <Text className="text-muted dark:text-muted-dark text-base">Tipo de Cuenta</Text>
            <Text className="font-semibold text-ink dark:text-ink-dark text-base">
              {ACCOUNT_TYPE_LABELS[account.type ?? ""] || account.type}
            </Text>
          </View>

          <View className="flex-row justify-between py-3 border-b border-black/10 dark:border-white/10">
            <Text className="text-muted dark:text-muted-dark text-base">Estado</Text>
            <Text
              className={`font-semibold text-base ${account.isActive ? "text-income dark:text-income-dark" : "text-expense dark:text-expense-dark"}`}
            >
              {account.isActive ? "Activa" : "Inactiva"}
            </Text>
          </View>

          {/* Muestra info de crédito solo si es de ese tipo */}
          {account.type === "credit" && account.creditLimit && (
            <View className="flex-row justify-between py-3">
              <Text className="text-muted dark:text-muted-dark text-base">Límite de Crédito</Text>
              <Text className="font-semibold text-ink dark:text-ink-dark text-base">
                ${account.creditLimit.toLocaleString("es-CO")}
              </Text>
            </View>
          )}
        </View>

        {/* ZONA DE PELIGRO */}
        <TouchableOpacity
          onPress={handleDelete}
          className="bg-expense/10 dark:bg-expense-dark/10 p-4 rounded-2xl items-center border border-expense/20 dark:border-expense-dark/20 my-2"
        >
          <Text className="text-expense dark:text-expense-dark font-bold text-lg">
            Eliminar Cuenta
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// Wrapper: lee el id, observa la cuenta y configura el header reactivo
export default function AccountDetailWrapper() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { account, loading } = useAccount(id);

  const handleEdit = useCallback(() => {
    if (account) {
      router.push({ pathname: "/accounts/new", params: { id: account.id } });
    }
  }, [account]);

  const handleDelete = useCallback(async () => {
    if (!account) return;
    try {
      await deleteAccount(account.id);
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo eliminar la cuenta.");
    }
  }, [account]);

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

  if (!id) return null;

  if (loading || !account) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-deep dark:bg-deep-dark">
        <ActivityIndicator size="large" color="#4b9aff" />
      </SafeAreaView>
    );
  }

  return <AccountDetailScreen account={account} onDelete={handleDelete} />;
}
