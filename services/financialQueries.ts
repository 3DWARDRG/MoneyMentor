// services/financialQueries.ts
//
// Funciones reutilizables de SOLO LECTURA sobre la base de datos local.
// Devuelven datos crudos (números, timestamps, ids) sin formatear, para que
// cualquier consumidor (tools de la IA, UI, tests) decida cómo presentarlos.
// Cada función filtra SIEMPRE por `user_id` para aislar al usuario activo.

import { database } from "@/database";
import { Q } from "@nozbe/watermelondb";

export const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);

/** Timestamp del primer día del mes, con `offsetMonths` hacia atrás. */
export const startOfMonth = (offsetMonths = 0) => {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth() - offsetMonths,
    1,
  ).getTime();
};

/** Timestamp del último día del mes (23:59:59.999), con `offsetMonths` hacia atrás. */
export const endOfMonth = (offsetMonths = 0) => {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth() - offsetMonths + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime();
};

/** Mapa id de categoría -> { name, icon } para el usuario. */
export const getCategoriesMap = async (userId: string) => {
  const cats = await database
    .get("categories")
    .query(Q.where("user_id", userId))
    .fetch();
  const map: Record<string, { name: string; icon: string }> = {};
  cats.forEach((c: any) => {
    map[c.id] = { name: c.name, icon: c.iconImage ?? "📁" };
  });
  return map;
};

export interface AccountSummaryData {
  totalBalance: number;
  activeAccounts: number;
  creditAccounts: number;
  totalAccounts: number;
}

export const fetchAccountSummary = async (
  userId: string,
): Promise<AccountSummaryData> => {
  const accounts = await database
    .get("accounts")
    .query(Q.where("user_id", userId))
    .fetch();

  let totalBalance = 0;
  let activeAccounts = 0;
  let creditAccounts = 0;

  accounts.forEach((a: any) => {
    if (a.isActive !== false) activeAccounts += 1;
    if (a.type === "credit") creditAccounts += 1;
    totalBalance += a.balance ?? 0;
  });

  return {
    totalBalance,
    activeAccounts,
    creditAccounts,
    totalAccounts: accounts.length,
  };
};

export interface MonthlySummaryData {
  income: number;
  expense: number;
  transfer: number;
  count: number;
  period: { start: number; end: number };
}

export const fetchMonthlySummary = async (
  userId: string,
  offsetMonths = 0,
): Promise<MonthlySummaryData> => {
  const start = startOfMonth(offsetMonths);
  const end = endOfMonth(offsetMonths);

  const transactions = await database
    .get("transactions")
    .query(Q.where("user_id", userId), Q.where("date", Q.between(start, end)))
    .fetch();

  let income = 0;
  let expense = 0;
  let transfer = 0;

  transactions.forEach((tx: any) => {
    if (tx.type === "income") income += tx.amount;
    else if (tx.type === "expense") expense += tx.amount;
    else transfer += tx.amount;
  });

  return {
    income,
    expense,
    transfer,
    count: transactions.length,
    period: { start, end },
  };
};

export interface CategoryExpenseRow {
  categoryId: string;
  category: string;
  icon: string;
  amount: number;
}

export const fetchExpensesByCategory = async (
  userId: string,
  offsetMonths = 0,
  limit = 5,
): Promise<CategoryExpenseRow[]> => {
  const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
  const start = startOfMonth(offsetMonths);
  const end = endOfMonth(offsetMonths);

  const transactions = await database
    .get("transactions")
    .query(
      Q.where("user_id", userId),
      Q.where("date", Q.between(start, end)),
    )
    .fetch();

  const categoriesMap = await getCategoriesMap(userId);

  const totals: Record<string, number> = {};
  transactions.forEach((tx: any) => {
    if (tx.type !== "expense") return;
    const key = tx.categoryId ?? "sin_categoria";
    totals[key] = (totals[key] ?? 0) + (tx.amount ?? 0);
  });

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
};

export interface RecentTransactionRow {
  id: string;
  amount: number;
  type: string;
  date: number;
  categoryId: string | null;
  category: string | null;
}

export const fetchRecentTransactions = async (
  userId: string,
  limit = 5,
): Promise<RecentTransactionRow[]> => {
  const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
  const categoriesMap = await getCategoriesMap(userId);

  const transactions = await database
    .get("transactions")
    .query(
      Q.where("user_id", userId),
      Q.sortBy("date", "desc"),
      Q.take(safeLimit)
    )
    .fetch();

  return transactions.map((tx: any) => {
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
};

export interface GoalRow {
  id: string;
  title: string;
  amount: number;
  savedAmount: number;
  progress: number;
  deadline: number | null;
}

export const fetchGoals = async (userId: string): Promise<GoalRow[]> => {
  const goals = await database
    .get("financial_goals")
    .query(Q.where("user_id", userId))
    .fetch();

  return goals.map((g: any) => ({
    id: g.id,
    title: g.title,
    amount: g.amount ?? 0,
    savedAmount: g.savedAmount ?? 0,
    progress: g.progress ?? 0,
    deadline: g.deadline ?? null,
  }));
};

export interface UpcomingReminderRow {
  id: string;
  title: string;
  amount: number;
  status: string;
  date: number;
}

export const fetchUpcomingReminders = async (
  userId: string,
  limit = 5,
): Promise<UpcomingReminderRow[]> => {
  const safeLimit = Math.min(10, Math.max(1, Math.floor(limit)));
  const now = Date.now();

  const events = await database
    .get("events")
    .query(
      Q.where("user_id", userId),
      Q.where("start_date", Q.gte(now)),
      Q.sortBy("start_date", "asc"),
      Q.take(safeLimit)
    )
    .fetch();

  return events.map((e: any) => ({
      id: e.id,
      title: e.title,
      amount: e.amount ?? 0,
      status: e.status,
      date: e.start_date,
    }));
};
