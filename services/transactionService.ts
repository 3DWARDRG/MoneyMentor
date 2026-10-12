import { runBatch } from "@/database/batch";
import { Account } from "@/database/models/mlAccount";
import { Transaction } from "@/database/models/mlTransaction";
import { AccountRepository } from "@/repositories/accounts";
import { TransactionRepository } from "@/repositories/transactions";
import {
  getExpenseOrIncomeDelta,
  getTransferDestinationDelta,
} from "@/services/accountService";
import { getCategoriesMap } from "@/services/categoryService";
import { endOfMonth, startOfMonth } from "@/utils/date";

type TxType = "income" | "expense" | "transfer";

type FeeType =
  | "maintenance"
  | "annual_fee"
  | "late_fee"
  | "cash_advance_fee"
  | "atm_fee"
  | "other_fee"
  | null;

interface TransactionLike {
  type: TxType;
  amount: number;
  transferTarget: "own" | "person" | "bank" | null;
}

interface BalanceChange {
  account: Account;
  delta: number;
}

// ---------------------------------------------------------------------------
// Efecto de una transacción sobre los balances
// ---------------------------------------------------------------------------

function computeBalanceChanges({
  transaction,
  sourceAccount,
  destinationAccount,
}: {
  transaction: TransactionLike;
  sourceAccount: Account | null;
  destinationAccount: Account | null;
}): BalanceChange[] {
  if (transaction.type === "transfer") {
    if (!sourceAccount) throw new Error("Cuenta origen requerida");
    if (transaction.transferTarget === "own" && !destinationAccount) {
      throw new Error("Cuenta destino requerida");
    }

    const changes: BalanceChange[] = [
      { account: sourceAccount, delta: -transaction.amount },
    ];

    if (transaction.transferTarget === "own" && destinationAccount) {
      changes.push({
        account: destinationAccount,
        delta: getTransferDestinationDelta({
          destinationAccount,
          amount: transaction.amount,
        }),
      });
    }

    return changes;
  }

  if (!sourceAccount) throw new Error("Cuenta requerida");

  const delta = getExpenseOrIncomeDelta({
    account: sourceAccount,
    txType: transaction.type,
    amount: transaction.amount,
  });

  return [{ account: sourceAccount, delta }];
}

/** Suma los deltas por cuenta para no tocar el mismo record dos veces. */
function mergeBalanceChanges(changes: BalanceChange[]): BalanceChange[] {
  const byAccount = new Map<string, BalanceChange>();
  for (const change of changes) {
    const existing = byAccount.get(change.account.id);
    if (existing) {
      existing.delta += change.delta;
    } else {
      byAccount.set(change.account.id, {
        account: change.account,
        delta: change.delta,
      });
    }
  }
  return [...byAccount.values()];
}

function prepareBalanceUpdates(changes: BalanceChange[]): Account[] {
  return changes.map(({ account, delta }) =>
    AccountRepository.prepareUpdate(account, {
      balance: Number(account.balance ?? 0) + delta,
    })
  );
}

// ---------------------------------------------------------------------------
// Escrituras (Unit of Work: transacción + balances, atómicas)
// ---------------------------------------------------------------------------

export interface CreateTransactionInput {
  userId: string;
  date: number;
  amount: number;
  description: string;
  type: TxType;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  goalId?: string | null;
  transferTarget: "own" | "person" | "bank" | null;
  installmentsTotal: number | null;
  installmentsPaid: number | null;
  feeType: FeeType;
}

export interface PreparedTransaction {
  transaction: Transaction;
  balanceUpdates: Account[];
}

/**
 * Prepara la transacción y las actualizaciones de balance SIN commitear.
 * El caller las agrega a su propio `runBatch` para escribir todo atómico.
 */
export async function prepareCreateTransaction(
  input: CreateTransactionInput
): Promise<PreparedTransaction> {
  const sourceAccount = await AccountRepository.findById(input.accountId);
  const destinationAccount =
    input.type === "transfer" &&
    input.transferTarget === "own" &&
    input.destinationAccountId
      ? await AccountRepository.findById(input.destinationAccountId)
      : null;

  const balanceUpdates = prepareBalanceUpdates(
    computeBalanceChanges({
      transaction: input,
      sourceAccount,
      destinationAccount,
    })
  );

  const transaction = TransactionRepository.prepareCreate({
    userId: input.userId,
    date: input.date,
    amount: input.amount,
    description:
      input.description ||
      (input.type === "transfer" ? "Transferencia interna" : "Sin descripción"),
    type: input.type,
    accountId: input.accountId,
    destinationAccountId: input.destinationAccountId,
    categoryId: input.categoryId,
    goalId: input.goalId ?? null,
    transferTarget: input.transferTarget,
    installmentsTotal: input.installmentsTotal,
    installmentsPaid: input.installmentsPaid,
    feeType: input.feeType,
  });

  return { transaction, balanceUpdates };
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction> {
  const { transaction, balanceUpdates } = await prepareCreateTransaction(input);
  await runBatch(transaction, ...balanceUpdates);
  return transaction;
}

export interface UpdateTransactionInput {
  transactionId: string;
  nextValues: {
    type: TxType;
    amount: number;
    description: string;
    date: number;
    accountId: string | null;
    destinationAccountId: string | null;
    categoryId: string | null;
    transferTarget: "own" | "person" | "bank" | null;
    installmentsTotal: number | null;
    installmentsPaid: number | null;
    feeType: FeeType;
  };
}

export async function updateTransaction({
  transactionId,
  nextValues,
}: UpdateTransactionInput): Promise<void> {
  const transaction = await TransactionRepository.findById(transactionId);

  const prevSource = transaction.accountId
    ? await AccountRepository.findById(transaction.accountId)
    : null;
  const prevDestination =
    transaction.type === "transfer" &&
    transaction.transferTarget === "own" &&
    transaction.destinationAccountId
      ? await AccountRepository.findById(transaction.destinationAccountId)
      : null;

  const revertChanges = computeBalanceChanges({
    transaction: {
      type: transaction.type,
      amount: transaction.amount,
      transferTarget: transaction.transferTarget,
    },
    sourceAccount: prevSource,
    destinationAccount: prevDestination,
  }).map((change) => ({ account: change.account, delta: -change.delta }));

  const nextSource = nextValues.accountId
    ? await AccountRepository.findById(nextValues.accountId)
    : null;
  const nextDestination =
    nextValues.type === "transfer" &&
    nextValues.transferTarget === "own" &&
    nextValues.destinationAccountId
      ? await AccountRepository.findById(nextValues.destinationAccountId)
      : null;

  const applyChanges = computeBalanceChanges({
    transaction: nextValues,
    sourceAccount: nextSource,
    destinationAccount: nextDestination,
  });

  const accountUpdates = prepareBalanceUpdates(
    mergeBalanceChanges([...revertChanges, ...applyChanges])
  );

  const preparedTransaction = TransactionRepository.prepareUpdate(transaction, {
    type: nextValues.type,
    amount: nextValues.amount,
    description: nextValues.description.trim() || "Sin descripción",
    date: nextValues.date,
    accountId: nextValues.accountId,
    destinationAccountId: nextValues.destinationAccountId,
    categoryId: nextValues.categoryId,
    transferTarget: nextValues.transferTarget,
    installmentsTotal: nextValues.installmentsTotal,
    installmentsPaid: nextValues.installmentsPaid,
    feeType: nextValues.feeType,
  });

  await runBatch(preparedTransaction, ...accountUpdates);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const transaction = await TransactionRepository.findById(transactionId);

  const sourceAccount = transaction.accountId
    ? await AccountRepository.findById(transaction.accountId)
    : null;
  const destinationAccount =
    transaction.type === "transfer" &&
    transaction.transferTarget === "own" &&
    transaction.destinationAccountId
      ? await AccountRepository.findById(transaction.destinationAccountId)
      : null;

  const revertChanges = computeBalanceChanges({
    transaction: {
      type: transaction.type,
      amount: transaction.amount,
      transferTarget: transaction.transferTarget,
    },
    sourceAccount,
    destinationAccount,
  }).map((change) => ({ account: change.account, delta: -change.delta }));

  const accountUpdates = prepareBalanceUpdates(mergeBalanceChanges(revertChanges));
  const preparedDelete = TransactionRepository.prepareDelete(transaction);

  await runBatch(preparedDelete, ...accountUpdates);
}

// ---------------------------------------------------------------------------
// Lecturas agregadas
// ---------------------------------------------------------------------------

export interface MonthlySummaryData {
  income: number;
  expense: number;
  transfer: number;
  count: number;
  period: { start: number; end: number };
}

export async function getMonthlySummary(
  userId: string,
  offsetMonths = 0
): Promise<MonthlySummaryData> {
  const start = startOfMonth(offsetMonths);
  const end = endOfMonth(offsetMonths);

  const transactions = await TransactionRepository.buildByUserAndDateRangeQuery(
    userId,
    start,
    end
  ).fetch();

  let income = 0;
  let expense = 0;
  let transfer = 0;

  for (const tx of transactions) {
    if (tx.type === "income") income += tx.amount;
    else if (tx.type === "expense") expense += tx.amount;
    else transfer += tx.amount;
  }

  return {
    income,
    expense,
    transfer,
    count: transactions.length,
    period: { start, end },
  };
}

export interface CategoryExpenseRow {
  categoryId: string;
  category: string;
  icon: string;
  amount: number;
}

export async function getExpensesByCategory(
  userId: string,
  offsetMonths = 0,
  limit = 5
): Promise<CategoryExpenseRow[]> {
  const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
  const start = startOfMonth(offsetMonths);
  const end = endOfMonth(offsetMonths);

  const transactions = await TransactionRepository.buildByUserAndDateRangeQuery(
    userId,
    start,
    end
  ).fetch();
  const categoriesMap = await getCategoriesMap(userId);

  const totals: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const key = tx.categoryId ?? "sin_categoria";
    totals[key] = (totals[key] ?? 0) + (tx.amount ?? 0);
  }

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, safeLimit)
    .map(([categoryId, amount]) => {
      const cat = categoriesMap[categoryId];
      return {
        categoryId,
        category: cat?.name ?? "Sin categoría",
        icon: cat?.icon ?? "📁",
        amount,
      };
    });
}

export interface RecentTransactionRow {
  id: string;
  amount: number;
  type: string;
  date: number;
  categoryId: string | null;
  category: string | null;
}

export async function getRecentTransactions(
  userId: string,
  limit = 5
): Promise<RecentTransactionRow[]> {
  const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
  const categoriesMap = await getCategoriesMap(userId);

  const transactions = await TransactionRepository.buildRecentByUserIdQuery(
    userId,
    safeLimit
  ).fetch();

  return transactions.map((tx) => {
    const cat = tx.categoryId ? categoriesMap[tx.categoryId] : undefined;
    return {
      id: tx.id,
      amount: tx.amount ?? 0,
      type: tx.type,
      date: tx.date,
      categoryId: tx.categoryId ?? null,
      category: cat?.name ?? null,
    };
  });
}
