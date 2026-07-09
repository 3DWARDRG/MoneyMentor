import ExpenseChart from "@/components/ExpenseChart";
import IncomeVsExpense from "@/components/IncomeVsExpense";
import MonthlyOverview from "@/components/MonthlyOverview";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { database } from "@/database";
import {
  useStatisticsData,
  type Period,
  PERIODS,
  type TypeTransactions,
  TRANSACTIONSTYPES,
} from "@/hooks/useStatisticsData";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";
import { useFocusEffect } from "expo-router";
import { useState, useCallback, Dispatch } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Statistics() {
  const { userId } = useAuthStore();
  const [period, setPeriod] = useState<Period>("Mensual");
  const [account, setAccount] = useState("All");
  const [transactionsType, setTransactionsType] = useState<TypeTransactions>("income");


  const TRANSACTIONS_ES: Record<TypeTransactions, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
};

  const transactionsTypesES: DropdownOption<TypeTransactions>[] =
    TRANSACTIONSTYPES.map((p) => ({
      label: TRANSACTIONS_ES[p],
      value: p,
    }));

  const periodOptions: DropdownOption<Period>[] = PERIODS.map((p) => ({
    label: p,
    value: p,
  }));

  const { totalIncome, totalExpense, totalTransfer, expenseByCategory, loading, start, end } =
    useStatisticsData(userId ?? "", period , transactionsType);

  console.log(

    totalIncome, totalExpense
  );

  const [categoryMap, setCategoryMap] = useState<
    Record<string, { name: string; icon: string }>
  >({});

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!userId) return;
        const cats = await database
          .get("categories")
          .query(Q.where("user_id", userId))
          .fetch();
        const map: Record<string, { name: string; icon: string }> = {};
        cats.forEach((c: any) => {
          map[c.id] = { name: c.name, icon: c.iconImage ?? "📁" };
        });
        setCategoryMap(map);
      };
      load();
    }, [userId]),
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 ">
          <View className="d-flex flex-row  z-50">
            <View className=" flex-1  m-2">
              <Dropdown
                options={periodOptions}
                value={period}
                onSelect={setPeriod}
                placeholder="Selecciona un Periodo"
              />
            </View>
            <View className="flex-1   m-2">
              <Dropdown
                options={transactionsTypesES}
                value={transactionsType}
                onSelect={setTransactionsType}
                placeholder="Selecciona un Tipo"
              />
            </View>
          </View>

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

          <IncomeVsExpense income={totalIncome} expense={totalExpense}  typeTransaction={transactionsType}/>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
