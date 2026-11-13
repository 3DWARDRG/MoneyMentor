import { useMemo } from "react";
import { of } from "@nozbe/watermelondb/utils/rx";
import { FinancialGoal } from "@/database/models/mlFinancialGoal";
import { useStreamState } from "@/hooks/useStream";
import { FinancialGoalRepository } from "@/repositories/financialGoals";

interface GoalsSummary {
  totalGoals: number;
  totalAmount: number;
  completedGoals: number;
}

/** Lista reactiva de metas del usuario + resumen derivado. */
export const useGoals = (userId: string) => {
  const { data, loading } = useStreamState<FinancialGoal[]>(
    () =>
      userId
        ? FinancialGoalRepository.buildByUserIdQuery(userId).observeWithColumns(
            FinancialGoalRepository.OBSERVABLE_COLUMNS
          )
        : of<FinancialGoal[]>([]),
    [],
    [userId]
  );

  const goals = useMemo(
    () => [...data].sort((a, b) => b.creationDate - a.creationDate),
    [data]
  );

  const summary = useMemo<GoalsSummary>(() => {
    let totalAmount = 0;
    let completedGoals = 0;

    for (const goal of goals) {
      totalAmount += goal.amount || 0;
      if (goal.progress === 100) completedGoals += 1;
    }

    return { totalGoals: goals.length, totalAmount, completedGoals };
  }, [goals]);

  return { goals, loading, summary };
};
