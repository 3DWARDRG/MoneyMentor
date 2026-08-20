// hooks/useFinanceData.ts
import { database } from "@/database";
import { Transaction } from "@/database/models/mlTransaction";
import { Q } from "@nozbe/watermelondb";
import { useEffect, useState } from "react";

interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
}

export const useFinanceData = (userId: string) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary>({
    income: 0,
    expense: 0,
    balance: 0,
  });

  useEffect(() => {
    console.log("🔑 useFinanceData userId:", userId); // ← agregar esto
    if (!userId) {
      setLoading(false);
      return;
    }
    // ...
  }, [userId]);

  // ✅ useEffect siempre se ejecuta — el guard va ADENTRO
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return; // ← ✅ esto es válido, es un early return del callback, no del hook
    }

    setLoading(true);

    const subscription = database
      .get<Transaction>("transactions")
      .query(Q.where("user_id", userId))
      .observe()
      .subscribe({
        next: (all) => {
          console.log("📡 observe emitió:", all.length, "transacciones");

          // Query SIN filtro para ver todos
          database
            .get<Transaction>("transactions")
            .query()
            .fetch()
          const sorted = [...all].sort((a, b) => b.date - a.date);
          setTransactions(sorted);

          let income = 0;
          let expense = 0;
          all.forEach((tx) => {
            if (tx.type === "income") income += tx.amount;
            else if (tx.type === "expense") expense += tx.amount;
          });

          setSummary({ income, expense, balance: income - expense });
          setLoading(false);
        },
        error: (err) => {
          console.error("❌ useFinanceData observe error:", err);
          setLoading(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [userId]); // ← siempre se declara, nunca condicional

  return { transactions, loading, summary };
};
