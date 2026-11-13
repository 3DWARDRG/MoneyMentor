// test/goalService.test.ts
//
// Verifica que el aporte a una meta sea ATÓMICO: tx + balance + meta
// en una sola llamada a runBatch.

import type { Account } from "../database/models/mlAccount";
import type { FinancialGoal } from "../database/models/mlFinancialGoal";
import type { Transaction } from "../database/models/mlTransaction";
import { runBatch } from "@/database/batch";
import { FinancialGoalRepository } from "@/repositories/financialGoals";
import { ensureAhorroCategory } from "@/services/categoryService";
import { prepareCreateTransaction } from "@/services/transactionService";
import {
  createGoalContribution,
  type CreateGoalContributionInput,
} from "../services/goalService";

jest.mock("@/database/batch", () => ({ runBatch: jest.fn() }));
jest.mock("@/services/categoryService", () => ({
  ensureAhorroCategory: jest.fn(),
}));
jest.mock("@/services/transactionService", () => ({
  prepareCreateTransaction: jest.fn(),
}));
jest.mock("@/repositories/financialGoals", () => ({
  FinancialGoalRepository: {
    findById: jest.fn(),
    prepareUpdate: jest.fn(),
  },
}));

const makeGoal = (overrides: Partial<FinancialGoal> = {}) =>
  ({
    id: "goal1",
    title: "Viaje",
    amount: 1000,
    savedAmount: 0,
    ...overrides,
  } as unknown as FinancialGoal);

const findGoal = jest.mocked(FinancialGoalRepository.findById);
const prepareGoalUpdate = jest.mocked(FinancialGoalRepository.prepareUpdate);
const ensureAhorro = jest.mocked(ensureAhorroCategory);
const prepareCreateTx = jest.mocked(prepareCreateTransaction);
const runBatchMock = jest.mocked(runBatch);

const txSentinel = { id: "tx" } as unknown as Transaction;
const balanceSentinel = { id: "upd-acc1" } as unknown as Account;
const goalUpdateSentinel = { id: "goal-update" } as unknown as FinancialGoal;

const contributionInput = (
  overrides: Partial<CreateGoalContributionInput> = {},
): CreateGoalContributionInput => ({
  userId: "u1",
  goalId: "goal1",
  amount: 100,
  accountId: "acc1",
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  findGoal.mockResolvedValue(makeGoal({ savedAmount: 200 }));
  ensureAhorro.mockResolvedValue("cat-ahorro");
  prepareCreateTx.mockResolvedValue({
    transaction: txSentinel,
    balanceUpdates: [balanceSentinel],
  });
  prepareGoalUpdate.mockReturnValue(goalUpdateSentinel);
});

describe("goalService.createGoalContribution", () => {
  it("aporte atómico: tx + balance + meta en UN solo runBatch", async () => {
    const goal = makeGoal({ savedAmount: 200 });
    findGoal.mockResolvedValue(goal);

    await createGoalContribution(contributionInput());

    expect(findGoal).toHaveBeenCalledWith("goal1");
    expect(ensureAhorro).toHaveBeenCalledWith("u1");
    expect(prepareCreateTx).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        amount: 100,
        type: "expense",
        accountId: "acc1",
        goalId: "goal1",
        categoryId: "cat-ahorro",
        description: "Aporte a meta: Viaje",
        date: expect.any(Number),
      }),
    );
    // 200 + 100 = 300 => 300/1000 = 30%
    expect(prepareGoalUpdate).toHaveBeenCalledWith(goal, {
      savedAmount: 300,
      progress: 30,
    });

    // Atomicidad: UNA sola llamada con los 3 registros.
    expect(runBatchMock).toHaveBeenCalledTimes(1);
    expect(runBatchMock).toHaveBeenCalledWith(
      txSentinel,
      balanceSentinel,
      goalUpdateSentinel,
    );
  });

  it("topa el progreso en 100%", async () => {
    const goal = makeGoal({ amount: 1000, savedAmount: 950 });
    findGoal.mockResolvedValue(goal);

    await createGoalContribution(contributionInput());

    // 950 + 100 = 1050 => 105% => se topa en 100
    expect(prepareGoalUpdate).toHaveBeenCalledWith(goal, {
      savedAmount: 1050,
      progress: 100,
    });
  });

  it("usa la descripción provista (trim)", async () => {
    await createGoalContribution(
      contributionInput({ description: "  Mi aporte  " }),
    );

    expect(prepareCreateTx).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Mi aporte" }),
    );
  });

  it.each([0, -10])(
    "rechaza monto <= 0 (%p) sin tocar la DB",
    async (amount) => {
      await expect(
        createGoalContribution(contributionInput({ amount })),
      ).rejects.toThrow("El monto debe ser mayor a 0");

      expect(findGoal).not.toHaveBeenCalled();
      expect(runBatchMock).not.toHaveBeenCalled();
    },
  );

  it("rechaza si la meta no existe y NO escribe", async () => {
    findGoal.mockRejectedValue(new Error("not found"));

    await expect(createGoalContribution(contributionInput())).rejects.toThrow(
      "not found",
    );

    expect(runBatchMock).not.toHaveBeenCalled();
  });
});
