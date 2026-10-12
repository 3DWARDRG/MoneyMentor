import { runBatch } from "@/database/batch";
import { FinancialGoalRepository } from "@/repositories/financialGoals";
import { ensureAhorroCategory } from "@/services/categoryService";
import { prepareCreateTransaction } from "@/services/transactionService";

export interface GoalRow {
  id: string;
  title: string;
  amount: number;
  savedAmount: number;
  progress: number;
  deadline: number | null;
}

export async function getGoals(userId: string): Promise<GoalRow[]> {
  const goals = await FinancialGoalRepository.buildByUserIdQuery(userId).fetch();

  return goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    amount: goal.amount ?? 0,
    savedAmount: goal.savedAmount ?? 0,
    progress: goal.progress ?? 0,
    deadline: goal.deadline ?? null,
  }));
}

export interface CreateGoalContributionInput {
  userId: string;
  goalId: string;
  amount: number;
  accountId: string;
  description?: string;
}

/**
 * Aporte a una meta: crea el gasto (con su efecto en el balance) y actualiza el
 * progreso de la meta en UNA sola transacción (todo o nada).
 */
export async function createGoalContribution(
  input: CreateGoalContributionInput
): Promise<void> {
  const { userId, goalId, amount, accountId, description } = input;

  if (amount <= 0) throw new Error("El monto debe ser mayor a 0");

  const goal = await FinancialGoalRepository.findById(goalId);
  const categoryId = await ensureAhorroCategory(userId);

  const { transaction, balanceUpdates } = await prepareCreateTransaction({
    userId,
    date: Date.now(),
    amount,
    description: description?.trim() || `Aporte a meta: ${goal.title}`,
    type: "expense",
    accountId,
    destinationAccountId: null,
    categoryId,
    goalId: goal.id,
    transferTarget: null,
    installmentsTotal: null,
    installmentsPaid: null,
    feeType: null,
  });

  const savedAmount = Number(goal.savedAmount ?? 0) + amount;
  const newProgress = Math.min(
    100,
    Math.round((savedAmount / (goal.amount || 1)) * 100)
  );

  const goalUpdate = FinancialGoalRepository.prepareUpdate(goal, {
    savedAmount,
    progress: newProgress,
  });

  await runBatch(transaction, ...balanceUpdates, goalUpdate);

  console.log(
    "✅ Aporte registrado:",
    amount,
    "a meta:",
    goal.title,
    "| ahorrado:",
    savedAmount,
    "| progreso:",
    newProgress
  );
}
