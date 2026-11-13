import { runBatch } from "@/database/batch";
import { FinancialGoal } from "@/database/models/mlFinancialGoal";
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

/** Lee una meta por id; devuelve null si no existe. */
export async function getGoalById(
  goalId: string
): Promise<FinancialGoal | null> {
  try {
    return await FinancialGoalRepository.findById(goalId);
  } catch {
    return null;
  }
}

export interface CreateGoalInput {
  userId: string;
  title: string;
  description: string;
  amount: number;
  deadline: number;
}

export async function createGoal(input: CreateGoalInput): Promise<FinancialGoal> {
  return await FinancialGoalRepository.create({
    userId: input.userId,
    title: input.title.trim(),
    description: input.description.trim(),
    amount: input.amount,
    deadline: input.deadline,
    creationDate: Date.now(),
    progress: 0,
    savedAmount: 0,
  });
}

export interface UpdateGoalInput {
  title: string;
  description: string;
  amount: number;
  deadline: number;
}

export async function updateGoal(
  goalId: string,
  input: UpdateGoalInput
): Promise<FinancialGoal> {
  const goal = await FinancialGoalRepository.findById(goalId);
  const savedAmount = Number(goal.savedAmount ?? 0);
  const progress = Math.min(
    100,
    Math.round((savedAmount / (input.amount || 1)) * 100)
  );

  return await FinancialGoalRepository.update(goalId, {
    title: input.title.trim(),
    description: input.description.trim(),
    amount: input.amount,
    deadline: input.deadline,
    progress,
  });
}

export async function deleteGoal(goalId: string): Promise<void> {
  await FinancialGoalRepository.delete(goalId);
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
