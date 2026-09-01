// app/(tabs)/accounts/index.tsx
import CardBackdrop from "@/components/ui/CardBackdrop";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";
import FloatingActionButton from "@/components/FloatingActionButton";
import { useFinanceCacheStore } from "@/store/useFinanceCacheStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import {
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PremiumIcon from "@/components/ui/PremiumIcon";
import { useShallow } from "zustand/react/shallow";

const CREDIT_SUBTYPE_LABELS: Record<string, string> = {
  credit_card: "Tarjeta de crédito",
  personal_loan: "Libre inversión",
  mortgage: "Hipotecario",
  credit_line: "Línea de crédito",
};

export default function AccountsScreen() {
  const userId = useAuthStore((s) => s.userId);

const {
    accounts,
    loading,
    summary,
  } = useFinanceCacheStore(
    useShallow((s) => ({
      accounts: s.accounts,
      loading: s.loading,
      summary: s.summary,
    })));


  const router = useRouter();

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
      <SafeAreaView className="flex-1 items-center justify-center">
        <ScreenBackdrop />
        <ActivityIndicator size="large" color="#4b9aff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <ScreenBackdrop />
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Mis Cuentas</Text>
        </View>

        <View className="mx-5 my-3 flex-row rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 px-2 py-4">
          <CardBackdrop glowColor="#1d7df0" glowOpacity={0.18} glowSize={220} glowTop={-90} glowRight={-70} />
          <View className="flex-1 items-center">
            <Text className="mb-1 text-[11px] text-muted dark:text-muted-dark">
              Balance total
            </Text>
            <Text className="text-base font-bold text-ink dark:text-ink-dark">
              ${summary.totalBalance.toLocaleString("es-CO")}
            </Text>
          </View>

          <View className="w-[1px] bg-black/30 dark:bg-white/30" />

          <View className="flex-1 items-center">
            <Text className="mb-1 text-[11px] text-muted dark:text-muted-dark">
              Cuentas activas
            </Text>
            <Text className="text-base font-bold text-ink dark:text-ink-dark">
              {summary.activeAccounts}
            </Text>
          </View>

          <View className="w-[1px] bg-black/30 dark:bg-white/30" />

          <View className="flex-1 items-center">
            <Text className="mb-1 text-[11px] text-muted dark:text-muted-dark">Créditos</Text>
            <Text className="text-base font-bold text-ink dark:text-ink-dark">
              {summary.creditAccounts}
            </Text>
          </View>
        </View>

        {accounts.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="wallet-outline" size={48} color="#4b9aff" />
            <Text className="mt-3 text-base font-semibold text-muted dark:text-muted-dark">
              No tienes cuentas aún
            </Text>
            <Text className="mt-1 text-center text-sm text-muted dark:text-muted-dark">
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
                  className="mb-3 rounded-xl bg-panel dark:bg-panel-dark p-4 border border-black/10 dark:border-white/10"
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
                    <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-accent/10 dark:bg-accent-dark/10">
                      <PremiumIcon token={item.iconImage} size={30} fallback="💳" />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-ink dark:text-ink-dark">
                        {item.name}
                      </Text>

                      <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                        {isCredit
                          ? `${subtypeLabel} • ${item.currency ?? "COP"}`
                          : `${item.type ?? "Sin tipo"} • ${item.currency ?? "COP"}`}
                      </Text>

                      {item.institution ? (
                        <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                          {item.institution}
                        </Text>
                      ) : null}
                    </View>

                    <View className="items-end">
                      <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">
                        {formatMoney(balance, item.currency ?? "COP")}
                      </Text>

                      {item.isActive === false && (
                        <Text className="mt-1 rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 text-[10px] text-ink dark:text-ink-dark">
                          Inactiva
                        </Text>
                      )}
                    </View>
                  </View>

                  {isCreditCard && (
                    <View className="mt-4 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark p-3">
                      <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
                        Tarjeta de crédito
                      </Text>

                      <View className="flex-row justify-between">
                        <View className="flex-1 pr-2">
                          <Text className="text-[11px] text-muted dark:text-muted-dark">
                            Límite
                          </Text>
                          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                            {formatMoney(creditLimit, item.currency ?? "COP")}
                          </Text>
                        </View>

                        <View className="flex-1 pl-2">
                          <Text className="text-[11px] text-muted dark:text-muted-dark">
                            Disponible
                          </Text>
                          <Text
                            className={`text-sm font-semibold ${
                              availableCredit >= 0
                                ? "text-income dark:text-income-dark"
                                : "text-expense dark:text-expense-dark"
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
                          <Text className="mr-3 text-xs text-muted dark:text-muted-dark">
                            Corte: {item.statementClosingDay}
                          </Text>
                        ) : null}

                        {item.paymentDueDay ? (
                          <Text className="mr-3 text-xs text-muted dark:text-muted-dark">
                            Pago: {item.paymentDueDay}
                          </Text>
                        ) : null}

                        {item.cardLast4 ? (
                          <Text className="text-xs text-muted dark:text-muted-dark">
                            •••• {item.cardLast4}
                          </Text>
                        ) : null}
                      </View>

                      {(item.aprAnnual || item.aprMonthly) && (
                        <Text className="mt-2 text-xs text-muted dark:text-muted-dark">
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
                    <View className="mt-4 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark p-3">
                      <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
                        {subtypeLabel}
                      </Text>

                      <View className="flex-row justify-between">
                        <View className="flex-1 pr-2">
                          <Text className="text-[11px] text-muted dark:text-muted-dark">
                            Saldo pendiente
                          </Text>
                          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                            {formatMoney(balance, item.currency ?? "COP")}
                          </Text>
                        </View>

                        <View className="flex-1 pl-2">
                          <Text className="text-[11px] text-muted dark:text-muted-dark">
                            Estado
                          </Text>
                          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                            {item.isActive === false ? "Inactiva" : "Activa"}
                          </Text>
                        </View>
                      </View>

                      {item.institution ? (
                        <Text className="mt-3 text-xs text-muted dark:text-muted-dark">
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
