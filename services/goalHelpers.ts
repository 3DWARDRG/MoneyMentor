import { database } from "@/database";
import { Category } from "@/database/models/mlCategory";
import { FinancialGoal } from "@/database/models/mlFinancialGoal";
import { Q } from "@nozbe/watermelondb";
import { createTransactionRecord } from "./transactionBalanceHelpers";

const AHORRO_CATEGORY = { name: "Ahorro", iconImage: "goal", type: "expense" };

const ensureAhorroCategory = async (userId: string): Promise<string> => {
  const catsCollection = database.get<Category>("categories");

  const existing = await catsCollection
    .query(
      Q.where("user_id", userId),
      Q.where("name", AHORRO_CATEGORY.name),
      Q.where("type", AHORRO_CATEGORY.type),
    )
    .fetch();

  if (existing.length > 0) {
    return existing[0].id;
  }

  let createdId = "";
  await database.write(async () => {
    const created = await catsCollection.create((record) => {
      record.userId = userId;
      record.name = AHORRO_CATEGORY.name;
      record.iconImage = AHORRO_CATEGORY.iconImage;
      record.type = AHORRO_CATEGORY.type;
    });
    createdId = created.id;
  });

  console.log("✅ Categoría Ahorro creada:", createdId);
  return createdId;
};

export const createGoalContribution = async ({
  userId,
  goalId,
  amount,
  accountId,
  description,
}: {
  userId: string;
  goalId: string;
  amount: number;
  accountId: string;
  description?: string;
}) => {
  if (amount <= 0) throw new Error("El monto debe ser mayor a 0");

  const goal = await database
    .get<FinancialGoal>("financial_goals")
    .find(goalId);

  const categoryId = await ensureAhorroCategory(userId);

  await createTransactionRecord({
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

  await database.write(async () => {
    const latest = await database
      .get<FinancialGoal>("financial_goals")
      .find(goalId);

    const savedAmount = Number(latest.savedAmount ?? 0) + amount;
    const newProgress = Math.min(
      100,
      Math.round((savedAmount / (latest.amount || 1)) * 100),
    );
    await latest.update((record) => {
      record.savedAmount = savedAmount;
      record.progress = newProgress;
    });

    console.log(
      "✅ Aporte registrado:",
      amount,
      "a meta:",
      latest.title,
      "| ahorrado:",
      savedAmount,
      "| progreso:",
      newProgress,
    );
  });
};
