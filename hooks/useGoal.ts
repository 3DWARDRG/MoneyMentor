import { FinancialGoal } from "@/database/models/mlFinancialGoal";
import { useStreamState } from "@/hooks/useStream";
import { FinancialGoalRepository } from "@/repositories/financialGoals";
import { of } from "@nozbe/watermelondb/utils/rx";

/** Una meta por id (reactivo a todos sus campos). */
export function useGoal(id: string | undefined): {
  goal: FinancialGoal | null;
  loading: boolean;
} {
  const { data, loading } = useStreamState<FinancialGoal | null>(
    () =>
      id
        ? FinancialGoalRepository.observeById(id)
        : of<FinancialGoal | null>(null),
    null,
    [id]
  );

  return { goal: data, loading };
}
