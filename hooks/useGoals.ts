// hooks/useGoals.ts
import { database } from "@/database";
import { FinancialGoal } from "@/database/models/mlFinancialGoal";
import { Q } from "@nozbe/watermelondb";
import { useEffect, useState } from "react";

interface GoalsSummary {
  totalGoals: number;
  totalAmount: number;
  completedGoals: number;
}

export const useGoals = (userId: string) => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<GoalsSummary>({
    totalGoals: 0,
    totalAmount: 0,
    completedGoals: 0,
  });

  useEffect(() => {
    console.log("🔑 useGoals userId:", userId);

    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const subscription = database
      .get<FinancialGoal>("financial_goals")
      .query(Q.where("user_id", userId))
      .observe()
      .subscribe({
        next: (all) => {
          console.log("📡 useGoals observe emitió:", all.length, "metas");

          const sorted = [...all].sort((a, b) => b.creationDate - a.creationDate);

          const totalAmount = sorted.reduce(
            (sum, goal) => sum + (goal.amount || 0),
            0,
          );
          const completedGoals = sorted.filter(
            (goal) => goal.progress === 100,
          ).length;

          setGoals(sorted);
          setSummary({
            totalGoals: sorted.length,
            totalAmount,
            completedGoals,
          });
          setLoading(false);
        },
        error: (err) => {
          console.error("❌ useGoals observe error:", err);
          setLoading(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [userId]);

  return { goals, loading, summary };
};
