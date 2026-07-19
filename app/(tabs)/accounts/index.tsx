// app/(tabs)/accounts/index.tsx
import FloatingActionButton from "@/components/FloatingActionButton";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CREDIT_SUBTYPE_LABELS: Record<string, string> = {
  credit_card: "Tarjeta de crédito",
  personal_loan: "Libre inversión",
  mortgage: "Hipotecario",
  credit_line: "Línea de crédito",
};

export default function AccountsScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { accounts, loading, summary, refreshAccounts } = useAccounts(
    userId ?? "",
  );
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      refreshAccounts?.();
    }, [userId, refreshAccounts]),
  );

  const formatMoney = (value: number | null | undefined, currency = "COP") => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  };

  const getCreditSubtypeLabel = (subtype?: string | null) => {
    if (!subtype) return "Crédito";
    return CREDIT_SUBTYPE_LABELS[subtype] ?? "Crédito";
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f5f5f5]">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f5f5f5]">
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-[#1a1a1a]">Mis Cuentas</Text>
        </View>

        <View className="mx-5 my-3 flex-row rounded-2xl bg-[#6C63FF] px-2 py-4">
          <View className="flex-1 items-center">
            <Text className="mb-1 text-[11px] text-black/80">
              Balance total
            </Text>
            <Text className="text-base font-bold text-black">
              ${summary.totalBalance.toLocaleString("es-CO")}
            </Text>
          </View>

          <View className="w-[1px] bg-white/30" />

          <View className="flex-1 items-center">
            <Text className="mb-1 text-[11px] text-black/80">
              Cuentas activas
            </Text>
            <Text className="text-base font-bold text-black">
              {summary.activeAccounts}
            </Text>
          </View>

          <View className="w-[1px] bg-white/30" />

          <View className="flex-1 items-center">
            <Text className="mb-1 text-[11px] text-black/80">Créditos</Text>
            <Text className="text-base font-bold text-black">
              {summary.creditAccounts}
            </Text>
          </View>
        </View>

        {accounts.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="wallet-outline" size={48} color="#ccc" />
            <Text className="mt-3 text-base font-semibold text-[#888]">
              No tienes cuentas aún
            </Text>
            <Text className="mt-1 text-center text-sm text-[#aaa]">
              Toca el botón + para agregar una
            </Text>
          </View>
        ) : (
          <FlatList
            data={accounts}
            extraData={`${summary.totalBalance}-${accounts.length}`}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 120,
            }}
            renderItem={({ item }) => {
              const isCredit = item.type === "credit";
              const isCreditCard =
                item.type === "credit" && item.creditSubtype === "credit_card";
              const balance = item.balance ?? 0;
              const creditLimit = item.creditLimit ?? 0;
              const availableCredit = creditLimit - balance;
              const subtypeLabel = getCreditSubtypeLabel(item.creditSubtype);

              return (
                <Pressable
                  className="mb-3 rounded-xl bg-white p-4"
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  onPress={() =>
                    router.push({
                      pathname: "/accounts/[id]",
                      params: { id: item.id },
                    })
                  }
                >
                  <View className="flex-row items-center">
                    <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#f0eeff]">
                      <Text className="text-[22px]">
                        {item.iconImage ?? "💳"}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-[#1a1a1a]">
                        {item.name}
                      </Text>

                      <Text className="mt-0.5 text-xs text-[#888]">
                        {isCredit
                          ? `${subtypeLabel} • ${item.currency ?? "COP"}`
                          : `${item.type ?? "Sin tipo"} • ${item.currency ?? "COP"}`}
                      </Text>

                      {item.institution ? (
                        <Text className="mt-0.5 text-xs text-[#aaa]">
                          {item.institution}
                        </Text>
                      ) : null}
                    </View>

                    <View className="items-end">
                      <Text className="text-[15px] font-bold text-[#1a1a1a]">
                        {formatMoney(balance, item.currency ?? "COP")}
                      </Text>

                      {item.isActive === false && (
                        <Text className="mt-1 rounded bg-[#ccc] px-1.5 py-0.5 text-[10px] text-black">
                          Inactiva
                        </Text>
                      )}
                    </View>
                  </View>

                  {isCreditCard && (
                    <View className="mt-4 rounded-xl bg-[#fafafa] p-3">
                      <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#666]">
                        Tarjeta de crédito
                      </Text>

                      <View className="flex-row justify-between">
                        <View className="flex-1 pr-2">
                          <Text className="text-[11px] text-[#888]">
                            Límite
                          </Text>
                          <Text className="text-sm font-semibold text-[#1a1a1a]">
                            {formatMoney(creditLimit, item.currency ?? "COP")}
                          </Text>
                        </View>

                        <View className="flex-1 pl-2">
                          <Text className="text-[11px] text-[#888]">
                            Disponible
                          </Text>
                          <Text
                            className={`text-sm font-semibold ${
                              availableCredit >= 0
                                ? "text-[#15803d]"
                                : "text-[#dc2626]"
                            }`}
                          >
                            {formatMoney(
                              availableCredit,
                              item.currency ?? "COP",
                            )}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 flex-row flex-wrap">
                        {item.statementClosingDay ? (
                          <Text className="mr-3 text-xs text-[#666]">
                            Corte: {item.statementClosingDay}
                          </Text>
                        ) : null}

                        {item.paymentDueDay ? (
                          <Text className="mr-3 text-xs text-[#666]">
                            Pago: {item.paymentDueDay}
                          </Text>
                        ) : null}

                        {item.cardLast4 ? (
                          <Text className="text-xs text-[#666]">
                            •••• {item.cardLast4}
                          </Text>
                        ) : null}
                      </View>

                      {(item.aprAnnual || item.aprMonthly) && (
                        <Text className="mt-2 text-xs text-[#666]">
                          {item.aprAnnual
                            ? `APR anual: ${item.aprAnnual}%`
                            : ""}
                          {item.aprAnnual && item.aprMonthly ? " · " : ""}
                          {item.aprMonthly
                            ? `mensual: ${item.aprMonthly}%`
                            : ""}
                        </Text>
                      )}
                    </View>
                  )}

                  {isCredit && !isCreditCard && (
                    <View className="mt-4 rounded-xl bg-[#fafafa] p-3">
                      <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#666]">
                        {subtypeLabel}
                      </Text>

                      <View className="flex-row justify-between">
                        <View className="flex-1 pr-2">
                          <Text className="text-[11px] text-[#888]">
                            Saldo pendiente
                          </Text>
                          <Text className="text-sm font-semibold text-[#1a1a1a]">
                            {formatMoney(balance, item.currency ?? "COP")}
                          </Text>
                        </View>

                        <View className="flex-1 pl-2">
                          <Text className="text-[11px] text-[#888]">
                            Estado
                          </Text>
                          <Text className="text-sm font-semibold text-[#1a1a1a]">
                            {item.isActive === false ? "Inactiva" : "Activa"}
                          </Text>
                        </View>
                      </View>

                      {item.institution ? (
                        <Text className="mt-3 text-xs text-[#666]">
                          Entidad: {item.institution}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}

        <FloatingActionButton href="/accounts/new" />
      </View>
    </SafeAreaView>
  );
}
