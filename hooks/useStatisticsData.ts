import { useMemo } from "react";
import { useFinanceData } from "./useFinanceData";

export const PERIODS = ["Mensual", "Trimestral", "Anual"] as const;
export type Period = (typeof PERIODS)[number];
export const TRANSACTIONSTYPES = ["income", "expense", "transfer"] as const;
export type TypeTransactions = (typeof TRANSACTIONSTYPES)[number];

export const getDateRange = (
  period: Period,
): { start: number; end: number } => {
  const now = new Date();
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime();

  let start: number;

  if (period === "Mensual") {
    start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  } else if (period === "Trimestral") {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), quarterStart, 1).getTime();
  } else {
    console.log("period:", period);

    start = new Date(now.getFullYear(), 0, 1).getTime();
  }

  return { start, end };
};

export const useStatisticsData = (
  userId: string,
  period: Period,
  TransactionType: TypeTransactions,
) => {
  const { transactions, loading } = useFinanceData(userId);

  const { start, end } = useMemo(() => getDateRange(period), [period]);

  const filtered = useMemo(
    () => transactions.filter((tx) => tx.date >= start && tx.date <= end),
    [transactions, start, end, TransactionType],
  );

  const totalIncome = useMemo(() => 

    filtered
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + (tx.amount ?? 0), 0), [filtered]);

  const totalExpense = useMemo(() => 

    filtered
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + (tx.amount ?? 0), 0), [filtered]);

  const totalTransfer = useMemo(
    () =>
      filtered
        .filter((tx) => tx.type === "transfer")
        .reduce((sum, tx) => sum + (tx.amount ?? 0), 0),
    [filtered],
  );

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered
      .filter((tx) => tx.type === TransactionType)
      .forEach((tx) => {
        const key = tx.categoryId ?? "sin_categoria";
        map[key] = (map[key] ?? 0) + (tx.amount ?? 0);
      });
    console.log(map);
    return map;
  }, [filtered]);

  return {
    loading,
    totalIncome,
    totalTransfer,
    totalExpense,
    expenseByCategory,
    filtered,
    start,
    end,
  };
};
