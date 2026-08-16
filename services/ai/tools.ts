// services/ai/tools.ts
import { database } from "@/database";
import { Q } from "@nozbe/watermelondb";
import type { AiToolDefinition } from "./types";
import { getActiveImportSummary, registerImportedTransactions } from "./import";

/**
 * Herramientas que el asistente puede usar para leer datos del usuario.
 *
 * PRIVACIDAD: cada tool devuelve SOLO la información mínima necesaria para
 * responder. Nunca se envían descripciones literales, notas, cuentas
 * bancarias, tarjetas, correos o datos personales. Los valores se agregan
 * y se redondean.
 */

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);

const startOfMonth = (offsetMonths = 0) => {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth() - offsetMonths,
    1,
  ).getTime();
};

const endOfMonth = (offsetMonths = 0) => {
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

const getCategoriesMap = async (userId: string) => {
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

const getBalanceSummary = async (userId: string): Promise<string> => {
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

  return JSON.stringify({
    ok: true,
    totalBalance: formatCOP(totalBalance),
    activeAccounts,
    creditAccounts,
    totalAccounts: accounts.length,
  });
};

const getMonthlySummary = async (
  userId: string,
  args: { months?: number },
): Promise<string> => {
  const offset = Math.max(0, Math.floor(args.months ?? 0));
  const start = startOfMonth(offset);
  const end = endOfMonth(offset);

  const transactions = await database
    .get("transactions")
    .query(Q.where("user_id", userId), Q.where("date", Q.gte(start), Q.lte(end)))
    .fetch();

  let income = 0;
  let expense = 0;
  let transfer = 0;

  transactions.forEach((tx: any) => {
    if (tx.type === "income") income += tx.amount;
    else if (tx.type === "expense") expense += tx.amount;
    else transfer += tx.amount;
  });

  const monthName = new Date(start).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return JSON.stringify({
    ok: true,
    period: monthName,
    income: formatCOP(income),
    expense: formatCOP(expense),
    transfer: formatCOP(transfer),
    net: formatCOP(income - expense),
    transactionCount: transactions.length,
  });
};

const getExpensesByCategory = async (
  userId: string,
  args: { months?: number; limit?: number },
): Promise<string> => {
  const offset = Math.max(0, Math.floor(args.months ?? 0));
  const limit = Math.min(20, Math.max(1, Math.floor(args.limit ?? 5)));
  const start = startOfMonth(offset);
  const end = endOfMonth(offset);

  const transactions = await database
    .get("transactions")
    .query(Q.where("user_id", userId), Q.where("date", Q.gte(start), Q.lte(end)))
    .fetch();

  const categoriesMap = await getCategoriesMap(userId);

  const totals: Record<string, number> = {};
  transactions.forEach((tx: any) => {
    if (tx.type !== "expense") return;
    const key = tx.categoryId ?? "sin_categoria";
    totals[key] = (totals[key] ?? 0) + (tx.amount ?? 0);
  });

  const rows = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([categoryId, amount]) => {
      const cat = categoriesMap[categoryId];
      return {
        category: cat?.name ?? "Sin categoría",
        icon: cat?.icon ?? "📁",
        amount: formatCOP(amount),
      };
    });

  return JSON.stringify({ ok: true, items: rows });
};

const getRecentTransactions = async (
  userId: string,
  args: { limit?: number },
): Promise<string> => {
  const limit = Math.min(20, Math.max(1, Math.floor(args.limit ?? 5)));
  const categoriesMap = await getCategoriesMap(userId);

  const transactions = await database
    .get("transactions")
    .query(Q.where("user_id", userId), Q.sortBy("date", "desc"))
    .fetch();

  const rows = transactions.slice(0, limit).map((tx: any) => {
    const cat = tx.categoryId ? categoriesMap[tx.categoryId] : undefined;
    return {
      amount: formatCOP(tx.amount ?? 0),
      type: tx.type,
      date: new Date(tx.date).toLocaleDateString("es-CO"),
      category: cat?.name ?? null,
    };
  });

  return JSON.stringify({ ok: true, items: rows });
};

const getGoalsSummary = async (userId: string): Promise<string> => {
  const goals = await database
    .get("financial_goals")
    .query(Q.where("user_id", userId))
    .fetch();

  const rows = goals.map((g: any) => ({
    title: g.title,
    amount: formatCOP(g.amount ?? 0),
    savedAmount: formatCOP(g.savedAmount ?? 0),
    progress: g.progress ?? 0,
    deadline: g.deadline
      ? new Date(g.deadline).toLocaleDateString("es-CO")
      : null,
  }));

  return JSON.stringify({
    ok: true,
    totalGoals: rows.length,
    items: rows,
  });
};

const getUpcomingReminders = async (
  userId: string,
  args: { limit?: number },
): Promise<string> => {
  const limit = Math.min(10, Math.max(1, Math.floor(args.limit ?? 5)));
  const now = Date.now();

  const events = await database
    .get("events")
    .query(Q.where("user_id", userId), Q.where("start_date", Q.gte(now)))
    .fetch();

  const sorted = [...events].sort(
    (a: any, b: any) => (a.start_date ?? 0) - (b.start_date ?? 0),
  );

  const rows = sorted.slice(0, limit).map((e: any) => ({
    title: e.title,
    amount: formatCOP(e.amount ?? 0),
    status: e.status,
    date: new Date(e.start_date).toLocaleDateString("es-CO"),
  }));

  return JSON.stringify({ ok: true, items: rows });
};

export const AI_TOOLS: AiToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_balance_summary",
      description:
        "Devuelve el balance total, número de cuentas activas y de crédito del usuario. Sin nombres de cuentas ni datos bancarios.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_monthly_summary",
      description:
        "Devuelve ingresos, gastos y transferencias del mes (o de hace N meses). Sin detalle de transacciones.",
      parameters: {
        type: "object",
        properties: {
          months: {
            type: "number",
            description: "Cuantos meses hacia atrás (0 = mes actual).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_expenses_by_category",
      description:
        "Devuelve los gastos agrupados por categoría (solo nombre, ícono y monto) para un período.",
      parameters: {
        type: "object",
        properties: {
          months: {
            type: "number",
            description: "Cuantos meses hacia atrás (0 = mes actual).",
          },
          limit: {
            type: "number",
            description: "Máximo de categorías a devolver (1-20).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_transactions",
      description:
        "Devuelve las transacciones recientes con monto, tipo, fecha y categoría. Sin descripciones ni cuentas.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Cantidad de transacciones (1-20).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_goals_summary",
      description: "Devuelve las metas de ahorro del usuario con su progreso.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_reminders",
      description:
        "Devuelve los próximos recordatorios/eventos del usuario con título, monto y fecha.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Cantidad de recordatorios (1-10).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_import_summary",
      description:
        "Devuelve el resumen de la importación de movimientos desde un extracto bancario que el usuario tiene pendiente por confirmar (solo conteos y totales, sin detalles ni datos personales). Usa esta herramienta cuando el usuario hable de importar o adjuntar un extracto.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const executeAiTool = async (
  name: string,
  args: Record<string, any>,
  userId: string,
): Promise<string> => {
  if (!userId) {
    return JSON.stringify({ ok: false, error: "Usuario no identificado" });
  }

  switch (name) {
    case "get_balance_summary":
      return getBalanceSummary(userId);
    case "get_monthly_summary":
      return getMonthlySummary(userId, args);
    case "get_expenses_by_category":
      return getExpensesByCategory(userId, args);
    case "get_recent_transactions":
      return getRecentTransactions(userId, args);
    case "get_goals_summary":
      return getGoalsSummary(userId);
    case "get_upcoming_reminders":
      return getUpcomingReminders(userId, args);
    case "get_import_summary":
      return JSON.stringify(getActiveImportSummary(userId));
    // Camino de ESCRITURA de importación. NO se expone al modelo en AI_TOOLS:
    // exige un token de sesión que solo la UI de verificación local conoce,
    // de modo que el asistente nunca pueda registrar movimientos por su cuenta.
    case "register_imported_transactions":
      try {
        const result = await registerImportedTransactions({
          userId,
          sessionId: String(args.sessionId ?? ""),
          token: String(args.token ?? ""),
          accountId: String(args.accountId ?? ""),
          items: Array.isArray(args.items) ? args.items : [],
        });
        return JSON.stringify({ ok: true, ...result });
      } catch (error: any) {
        return JSON.stringify({
          ok: false,
          error: error?.message ?? "Error al guardar movimientos",
        });
      }
    default:
      return JSON.stringify({
        ok: false,
        error: `Herramienta desconocida: ${name}`,
      });
  }
};
