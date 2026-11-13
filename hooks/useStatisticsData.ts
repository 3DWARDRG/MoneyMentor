import { useMemo } from "react";
import { useTransactions } from "./useTransactions";

export const PERIODS = ["Mensual", "Trimestral", "Anual"] as const;
export type Period = (typeof PERIODS)[number];
export const TRANSACTIONSTYPES = ["income", "expense", "transfer"] as const;
export type TypeTransactions = (typeof TRANSACTIONSTYPES)[number];

/**
 * Rango de fechas (timestamps en ms) para un período rápido predefinido.
 * El `end` es SIEMPRE hoy (23:59:59.999): no tiene sentido pedir gastos
 * futuros, así que el lapso se recorta al día actual de forma dinámica.
 */
export const getDateRange = (
  period: Period,
): { start: number; end: number } => {
  const now = new Date();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
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
    start = new Date(now.getFullYear(), 0, 1).getTime();
  }

  return { start, end };
};

/**
 * Datos de estadísticas. `start`/`end` son el rango efectivo (período rápido o
 * rango personalizado elegido en el calendario) y `categoryId` opcional filtra
 * toda la data a una categoría concreta.
 */
export const useStatisticsData = (
  userId: string,
  start: number,
  end: number,
  TransactionType: TypeTransactions,
  categoryId?: string,
) => {
  const { transactions, loading } = useTransactions(userId);

  const filtered = useMemo(
    () => transactions.filter((tx) => tx.date >= start && tx.date <= end),
    [transactions, start, end],
  );

  const categoryFiltered = useMemo(
    () =>
      categoryId
        ? filtered.filter((tx) => tx.categoryId === categoryId)
        : filtered,
    [filtered, categoryId],
  );

  const totalIncome = useMemo(
    () =>
      categoryFiltered
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + (tx.amount ?? 0), 0),
    [categoryFiltered],
  );

  const totalExpense = useMemo(
    () =>
      categoryFiltered
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + (tx.amount ?? 0), 0),
    [categoryFiltered],
  );

  const totalTransfer = useMemo(
    () =>
      categoryFiltered
        .filter((tx) => tx.type === "transfer")
        .reduce((sum, tx) => sum + (tx.amount ?? 0), 0),
    [categoryFiltered],
  );

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    categoryFiltered
      .filter((tx) => tx.type === TransactionType)
      .forEach((tx) => {
        const key = tx.categoryId ?? "sin_categoria";
        map[key] = (map[key] ?? 0) + (tx.amount ?? 0);
      });
    return map;
  }, [categoryFiltered, TransactionType]);

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
