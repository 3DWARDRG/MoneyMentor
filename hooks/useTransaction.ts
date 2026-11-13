import { Transaction } from "@/database/models/mlTransaction";
import { useStreamState } from "@/hooks/useStream";
import { TransactionRepository } from "@/repositories/transactions";
import { of } from "@nozbe/watermelondb/utils/rx";

/** Una transacción por id (reactivo a todos sus campos). */
export function useTransaction(id: string | undefined): {
  transaction: Transaction | null;
  loading: boolean;
} {
  const { data, loading } = useStreamState<Transaction | null>(
    () =>
      id ? TransactionRepository.observeById(id) : of<Transaction | null>(null),
    null,
    [id]
  );

  return { transaction: data, loading };
}
