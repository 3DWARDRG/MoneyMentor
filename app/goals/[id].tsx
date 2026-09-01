import PremiumIcon from "@/components/ui/PremiumIcon";
import { database } from "@/database";
import { Account } from "@/database/models/mlAccount";
import { FinancialGoal } from "@/database/models/mlFinancialGoal";
import { createGoalContribution } from "@/services/goalHelpers";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";
import { withObservables } from "@nozbe/watermelondb/react";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface GoalDetailProps {
  goal: FinancialGoal;
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
  }).format(value);

const formatDate = (timestamp: number) => {
  const d = new Date(timestamp);
  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const GoalDetailScreen = ({ goal }: GoalDetailProps) => {
  const navigation = useNavigation();
  const userId = useAuthStore((s) => s.userId);

  const savedAmount = goal.savedAmount ?? 0;
  const computedProgress = Math.min(
    100,
    Math.round((savedAmount / (goal.amount || 1)) * 100),
  );
  const progress = goal.progress ?? computedProgress;

  const [contributionVisible, setContributionVisible] = useState(false);
  const [amountRaw, setAmountRaw] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  React.useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const formatCOPInput = useCallback((text: string) => {
    const numeric = text.replace(/\D/g, "");
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }, []);

  const openContributionModal = async () => {
    setAmountRaw("");
    setSelectedAccountId(null);
    setContributionVisible(true);

    if (!userId) return;

    try {
      const accCollection = database.get<Account>("accounts");
      const all = await accCollection.query(Q.where("user_id", userId)).fetch();
      const active = all
        .filter((acc) => acc.isActive !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
      setAccounts(active);
      if (active.length > 0) setSelectedAccountId(active[0].id);
    } catch (error) {
      console.error("❌ Error cargando cuentas para aporte:", error);
    }
  };

  const handleContribute = async () => {
    if (!userId) {
      Alert.alert("Error", "No se encontró el usuario actual");
      return;
    }

    const numericAmount = Number(amountRaw.replace(/\./g, ""));
    if (!amountRaw || numericAmount <= 0) {
      Alert.alert("Error", "Ingresa un monto válido");
      return;
    }

    if (!selectedAccountId) {
      Alert.alert("Error", "Selecciona una cuenta de origen");
      return;
    }

    setSubmitting(true);
    try {
      await createGoalContribution({
        userId,
        goalId: goal.id,
        amount: numericAmount,
        accountId: selectedAccountId,
      });
      setContributionVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo registrar el aporte");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = useCallback(() => {
    router.push({
      pathname: "/goals/new",
      params: { id: goal.id },
    });
  }, [goal]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text className="text-accent dark:text-accent-dark font-medium">
            Cerrar
          </Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleEdit} hitSlop={8}>
          <Text className="text-accent dark:text-accent-dark font-medium">
            Editar
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleEdit]);

  const handleDelete = async () => {
    Alert.alert("Eliminar meta", "Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await database.write(async () => {
              const record = await database
                .get<FinancialGoal>("financial_goals")
                .find(goal.id);
              await record.destroyPermanently();
            });
            router.back();
          } catch (error: any) {
            Alert.alert("Error", error.message || "No se pudo eliminar");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-deep dark:bg-deep-dark"
      edges={["bottom", "left", "right"]}
    >
      <ScrollView className="flex-1 p-5">
        <View className="gap-4">
          <View className="p-4 rounded-xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10">
            <Text className="text-xs text-muted dark:text-muted-dark">
              Título
            </Text>
            <Text className="text-base font-semibold text-ink dark:text-ink-dark capitalize">
              {goal.title || "Sin título"}
            </Text>
          </View>

          <View className="p-4 rounded-xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10">
            <Text className="text-xs text-muted dark:text-muted-dark">
              Progreso
            </Text>
            <Text className="text-base font-semibold text-ink dark:text-ink-dark mb-2">
              {progress}%
            </Text>
            <View className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <View
                className="h-full rounded-full bg-accent dark:bg-accent-dark"
                style={{ width: `${progress}%` }}
              />
            </View>
          </View>

          <View className="p-4 rounded-xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10">
            <Text className="text-xs text-muted dark:text-muted-dark">
              Ahorrado
            </Text>
            <Text className="text-base font-semibold text-income dark:text-income-dark">
              {formatCOP(savedAmount)}
            </Text>
          </View>

          <View className="p-4 rounded-xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10">
            <Text className="text-xs text-muted dark:text-muted-dark">
              Monto objetivo
            </Text>
            <Text className="text-base font-semibold text-ink dark:text-ink-dark">
              {formatCOP(goal.amount ?? 0)}
            </Text>
          </View>

          <View className="p-4 rounded-xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10">
            <Text className="text-xs text-muted dark:text-muted-dark">
              Fecha límite
            </Text>
            <Text className="text-base font-semibold text-ink dark:text-ink-dark">
              {formatDate(goal.deadline)}
            </Text>
          </View>

          <View className="p-4 rounded-xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10">
            <Text className="text-xs text-muted dark:text-muted-dark">
              Descripción
            </Text>
            <Text className="text-base font-semibold text-ink dark:text-ink-dark">
              {goal.description || "Sin descripción"}
            </Text>
          </View>

          <View className="pt-6">
            <TouchableOpacity
              className="bg-income dark:bg-income-dark py-4 rounded-lg items-center mb-3"
              onPress={openContributionModal}
            >
              <Text className="text-[#07101e] font-semibold text-base">
                Aportar dinero
              </Text>
            </TouchableOpacity>

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

      <Modal
        visible={contributionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContributionVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View
            className="bg-panel dark:bg-panel-dark border-t border-black/10 dark:border-white/10 rounded-t-3xl p-5"
            style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : 20 }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-ink dark:text-ink-dark">
                Aportar a la meta
              </Text>
              <TouchableOpacity onPress={() => setContributionVisible(false)}>
                <Text className="text-accent dark:text-accent-dark font-medium">
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-2">
                Monto *
              </Text>
              <View className="relative">
                <Text className="absolute left-3 top-3 text-muted dark:text-muted-dark text-lg">
                  $
                </Text>
                <TextInput
                  className="pl-8 pr-4 py-3 border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark rounded-lg text-lg text-ink dark:text-ink-dark"
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  value={amountRaw}
                  onChangeText={(text) => setAmountRaw(formatCOPInput(text))}
                  autoFocus
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-2">
                Cuenta de origen *
              </Text>

              {accounts.length === 0 ? (
                <Text className="text-muted dark:text-muted-dark text-center">
                  No hay cuentas activas disponibles.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-row"
                >
                  {accounts.map((account) => {
                    const isSelected = selectedAccountId === account.id;
                    return (
                      <TouchableOpacity
                        key={account.id}
                        onPress={() => setSelectedAccountId(account.id)}
                        className={`mx-2 px-4 py-3 rounded-2xl border ${
                          isSelected
                            ? "bg-accent/10 dark:bg-accent-dark/10 border-accent dark:border-accent-dark"
                            : "bg-deepSoft dark:bg-deepSoft-dark border-black/10 dark:border-white/10"
                        }`}
                        style={{ minWidth: 150 }}
                      >
                        <PremiumIcon
                          token={account.iconImage}
                          size={32}
                          fallback="🏦"
                        />
                        <Text
                          numberOfLines={1}
                          className={`font-semibold ${isSelected ? "text-accent dark:text-accent-dark" : "text-ink dark:text-ink-dark"}`}
                        >
                          {account.name}
                        </Text>
                        <Text
                          className={`text-xs mt-1 ${isSelected ? "text-accent/80 dark:text-accent-dark/80" : "text-muted dark:text-muted-dark"}`}
                        >
                          {account.currency}{" "}
                          {Number(account.balance ?? 0).toLocaleString("es-CO")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <TouchableOpacity
              className={`${submitting ? "opacity-50" : ""} bg-income dark:bg-income-dark py-4 rounded-lg items-center mb-2`}
              onPress={handleContribute}
              disabled={submitting}
            >
              <Text className="text-[#07101e] font-semibold text-base">
                {submitting ? "Registrando..." : "Confirmar aporte"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const enhance = withObservables(["id"], ({ id }: { id: string }) => ({
  goal: database.collections
    .get<FinancialGoal>("financial_goals")
    .findAndObserve(id),
}));

const EnhancedGoalDetail = enhance(GoalDetailScreen);

export default function GoalDetailWrapper() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) return null;

  return <EnhancedGoalDetail id={id} />;
}
