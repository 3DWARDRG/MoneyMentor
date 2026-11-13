import React, { useMemo } from "react";
import { Text, View } from "react-native";
import ReactECharts from "echarts-for-react/lib/core";
import { echarts } from "./echarts.web";
import {
  EXPENSE_COLOR,
  INCOME_COLOR,
  buildIncomeVsExpenseOption,
  formatCOP,
} from "./charts/echartsOptions";

interface IncomeVsExpenseProps {
  income: number;
  expense: number;
  typeTransaction: string;
}

const IncomeVsExpense: React.FC<IncomeVsExpenseProps> = ({
  income,
  expense,
  typeTransaction,
}) => {
  const total = income + expense;

  const option = useMemo(
    () => buildIncomeVsExpenseOption(income, expense),
    [income, expense],
  );

  if (typeTransaction === "transfer") return null;

  return (
    <View className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-5">
      <Text className="font-bold text-base mb-2 text-slate-100">
        Ingresos vs Gastos
      </Text>

      {total <= 0 ? (
        <Text className="text-slate-400 text-center py-8">
          No hay movimientos en este período
        </Text>
      ) : (
        <>
          <View className="w-full h-52 items-center justify-center">
            <ReactECharts
              echarts={echarts}
              option={option}
              style={{ width: "100%", height: "100%" }}
              notMerge
            />
          </View>

          <View className="flex-row justify-between mt-2">
            <View>
              <View className="flex-row items-center mb-1">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: INCOME_COLOR }}
                />
                <Text className="text-sm font-medium text-slate-100">
                  Ingresos
                </Text>
              </View>
              <Text className="font-bold text-slate-100">
                {formatCOP(income)}
              </Text>
            </View>

            <View className="items-end">
              <View className="flex-row items-center mb-1">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: EXPENSE_COLOR }}
                />
                <Text className="text-sm font-medium text-slate-100">
                  Gastos
                </Text>
              </View>
              <Text className="font-bold text-slate-100">
                {formatCOP(expense)}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

export default IncomeVsExpense;
