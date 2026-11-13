import { useMemo } from "react";
import { Transaction } from "@/database/models/mlTransaction";

export interface TransactionsSummary {
  income: number;
  expense: number;
  balance: number;
}

/** Agregado derivado de la lista de transacciones (sin re-consultar la DB). */
export function useTransactionsSummary(
  transactions: Transaction[]
): TransactionsSummary {
  return useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of transactions) {
      if (tx.type === "income") income += tx.amount;
      else if (tx.type === "expense") expense += tx.amount;
    }

    return { income, expense, balance: income - expense };
  }, [transactions]);
}
