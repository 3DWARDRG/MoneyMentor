import { useMemo } from "react";
import { of } from "@nozbe/watermelondb/utils/rx";
import { Transaction } from "@/database/models/mlTransaction";
import { useStreamState } from "@/hooks/useStream";
import { TransactionRepository } from "@/repositories/transactions";

/** Lista reactiva de transacciones del usuario (más recientes primero). */
export function useTransactions(userId: string): {
  transactions: Transaction[];
  loading: boolean;
} {
  const { data, loading } = useStreamState<Transaction[]>(
    () =>
      userId
        ? TransactionRepository.buildByUserIdQuery(userId).observeWithColumns(
            TransactionRepository.OBSERVABLE_COLUMNS
          )
        : of<Transaction[]>([]),
    [],
    [userId]
  );

  const transactions = useMemo(
    () => [...data].sort((a, b) => b.date - a.date),
    [data]
  );

  return { transactions, loading };
}
