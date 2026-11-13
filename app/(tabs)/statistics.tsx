import DateRangePicker from "@/components/DateRangePicker";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import ExpenseChart from "@/components/ExpenseChart";
import IncomeVsExpense from "@/components/IncomeVsExpense";
import MonthlyOverview from "@/components/MonthlyOverview";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";
import { useCategories } from "@/hooks/useCategories";
import {
  getDateRange,
  useStatisticsData,
  type Period,
  type TypeTransactions,
} from "@/hooks/useStatisticsData";
import { useAuthStore } from "@/store/useAuthStore";
import {
  periodOptions,
  TRANSACTIONS_ES,
  transactionsTypesES,
} from "@/utils/translateDataDropdowns";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatRange = (start: number, end: number) => {
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(new Date(start))} - ${fmt(new Date(end))}`;
};

export default function Statistics() {
  const userId = useAuthStore((s) => s.userId);
  const [period, setPeriod] = useState<Period>("Mensual");
  const [customRange, setCustomRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [transactionsType, setTransactionsType] =
    useState<TypeTransactions>("income");
  const [categoryId, setCategoryId] = useState<string>("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const { categories } = useCategories(userId ?? "");

  const { start, end } = useMemo(
    () => customRange ?? getDateRange(period),
    [customRange, period],
  );

  const {
    totalIncome,
    totalExpense,
    totalTransfer,
    expenseByCategory,
    loading,
  } = useStatisticsData(
    userId ?? "",
    start,
    end,
    transactionsType,
    categoryId || undefined,
  );

  const categoryOptions = useMemo<DropdownOption<string>[]>(
    () => [
      { label: "Todas las categorías", value: "" },
      ...categories
        .filter((c) => c.type === transactionsType)
        .map((c) => ({ label: c.name, value: c.id })),
    ],
    [categories, transactionsType],
  );

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    setCustomRange(null);
  };

  const handleTypeChange = (t: TypeTransactions) => {
    setTransactionsType(t);
    setCategoryId("");
  };

  const handleRangeConfirm = (s: number, e: number) => {
    setCustomRange({ start: s, end: e });
    setPickerVisible(false);
  };

  return (
    <SafeAreaView className="flex-1">
      <ScreenBackdrop />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4">
          <View className="d-flex flex-row z-50">
            <View className="flex-1 m-2">
              <Dropdown
                options={periodOptions}
                value={period}
                onSelect={handlePeriodChange}
                placeholder="Selecciona un Periodo"
              />
            </View>
            <View className="flex-1 m-2">
              <Dropdown
                options={transactionsTypesES}
                value={transactionsType}
                onSelect={handleTypeChange}
                placeholder="Selecciona un Tipo"
              />
            </View>
          </View>

          <View className="m-2">
            <Pressable
              onPress={() => setPickerVisible(true)}
              className="flex-row items-center justify-between min-h-12 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3"
            >
              <Text className="text-base text-ink dark:text-ink-dark">
                📅 {formatRange(start, end)}
              </Text>
              <Text className="text-xs text-muted dark:text-muted-dark">
                Cambiar rango
              </Text>
            </Pressable>
          </View>

          {transactionsType !== "transfer" && (
            <View className="m-2">
              <Dropdown
                options={categoryOptions}
                value={categoryId}
                onSelect={setCategoryId}
                placeholder="Selecciona una Categoría"
              />
            </View>
          )}

          <View>
            <MonthlyOverview
              transactionstype={transactionsType}
              totalExpense={totalExpense}
              totalIncome={totalIncome}
              totalTransfer={totalTransfer}
              loading={loading}
              periodStart={start}
              periodEnd={end}
            />
          </View>
          <View>
            <ExpenseChart
              expenseByCategory={expenseByCategory}
              typeTransaction={TRANSACTIONS_ES[transactionsType]}
              loading={loading}
            />
          </View>

          <IncomeVsExpense
            income={totalIncome}
            expense={totalExpense}
            typeTransaction={transactionsType}
          />
        </View>
      </ScrollView>

      <DateRangePicker
        visible={pickerVisible}
        initialStart={start}
        initialEnd={end}
        onConfirm={handleRangeConfirm}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}
