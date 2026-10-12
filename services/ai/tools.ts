// services/ai/tools.ts
import { formatCOP } from "@/utils/format";
import { getGoals } from "@/services/goalService";
import { getAccountSummary } from "@/services/accountService";
import { getUpcomingReminders } from "@/services/eventService";
import {
  getExpensesByCategory,
  getMonthlySummary,
  getRecentTransactions,
} from "@/services/transactionService";
import type { AiToolDefinition } from "./types";
import { getActiveImportSummary, registerImportedTransactions } from "./import";

/**
 * Herramientas que el asistente puede usar para leer datos del usuario.
 *
 * PRIVACIDAD: cada tool devuelve SOLO la información mínima necesaria para
 * responder. Nunca se envían descripciones literales, notas, cuentas
 * bancarias, tarjetas, correos o datos personales. Los valores se agregan
 * y se redondean.
 *
 * Diseño: registro data-driven. Cada tool es un objeto con su definición
 * (schema OpenAI), un flag `exposed` y su handler. Los handlers SOLO llaman
 * a las funciones reutilizables de los services de dominio y
 * serializan; la lógica de datos vive en un solo lugar.
 */

interface AiTool {
  definition: AiToolDefinition;
  /** Si es `true`, el modelo ve la tool en `AI_TOOLS` y puede invocarla. */
  exposed: boolean;
  handler: (userId: string, args: Record<string, any>) => Promise<string>;
}

const tools: AiTool[] = [
  {
    exposed: true,
    definition: {
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
    handler: async (userId) => {
      const data = await getAccountSummary(userId);
      return JSON.stringify({
        ok: true,
        totalBalance: formatCOP(data.totalBalance),
        activeAccounts: data.activeAccounts,
        creditAccounts: data.creditAccounts,
        totalAccounts: data.totalAccounts,
      });
    },
  },
  {
    exposed: true,
    definition: {
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
    handler: async (userId, args) => {
      const offset = Math.max(0, Math.floor(args.months ?? 0));
      const data = await getMonthlySummary(userId, offset);
      const monthName = new Date(data.period.start).toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      });
      return JSON.stringify({
        ok: true,
        period: monthName,
        income: formatCOP(data.income),
        expense: formatCOP(data.expense),
        transfer: formatCOP(data.transfer),
        net: formatCOP(data.income - data.expense),
        transactionCount: data.count,
      });
    },
  },
  {
    exposed: true,
    definition: {
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
    handler: async (userId, args) => {
      const offset = Math.max(0, Math.floor(args.months ?? 0));
      const limit = Math.min(20, Math.max(1, Math.floor(args.limit ?? 5)));
      const rows = await getExpensesByCategory(userId, offset, limit);
      return JSON.stringify({
        ok: true,
        items: rows.map((r) => ({
          category: r.category,
          icon: r.icon,
          amount: formatCOP(r.amount),
        })),
      });
    },
  },
  {
    exposed: true,
    definition: {
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
    handler: async (userId, args) => {
      const limit = Math.min(20, Math.max(1, Math.floor(args.limit ?? 5)));
      const rows = await getRecentTransactions(userId, limit);
      return JSON.stringify({
        ok: true,
        items: rows.map((tx) => ({
          amount: formatCOP(tx.amount),
          type: tx.type,
          date: new Date(tx.date).toLocaleDateString("es-CO"),
          category: tx.category,
        })),
      });
    },
  },
  {
    exposed: true,
    definition: {
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
    handler: async (userId) => {
      const goals = await getGoals(userId);
      return JSON.stringify({
        ok: true,
        totalGoals: goals.length,
        items: goals.map((g) => ({
          title: g.title,
          amount: formatCOP(g.amount),
          savedAmount: formatCOP(g.savedAmount),
          progress: g.progress,
          deadline: g.deadline
            ? new Date(g.deadline).toLocaleDateString("es-CO")
            : null,
        })),
      });
    },
  },
  {
    exposed: true,
    definition: {
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
    handler: async (userId, args) => {
      const limit = Math.min(10, Math.max(1, Math.floor(args.limit ?? 5)));
      const events = await getUpcomingReminders(userId, limit);
      return JSON.stringify({
        ok: true,
        items: events.map((e) => ({
          title: e.title,
          amount: formatCOP(e.amount),
          status: e.status,
          date: new Date(e.date).toLocaleDateString("es-CO"),
        })),
      });
    },
  },
  {
    exposed: true,
    definition: {
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
    handler: async (userId) => JSON.stringify(getActiveImportSummary(userId)),
  },
  // Camino de ESCRITURA de importación. NO se expone al modelo (exposed: false):
  // exige un token de sesión que solo la UI de verificación local conoce,
  // de modo que el asistente nunca pueda registrar movimientos por su cuenta.
  {
    exposed: false,
    definition: {
      type: "function",
      function: {
        name: "register_imported_transactions",
        description: "Registra los movimientos verificados de una sesión de importación.",
        parameters: {
          type: "object",
          properties: {
            sessionId: { type: "string", description: "Id de la sesión de importación." },
            token: { type: "string", description: "Token de la sesión." },
            accountId: { type: "string", description: "Cuenta de destino." },
            items: { type: "array", description: "Movimientos a registrar." },
          },
        },
      },
    },
    handler: async (userId, args) => {
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
    },
  },
];

/** Tools que el modelo puede ver e invocar. */
export const AI_TOOLS: AiToolDefinition[] = tools
  .filter((t) => t.exposed)
  .map((t) => t.definition);

/** Ejecuta una tool por nombre; solo hace lookup en el registro. */
export const executeAiTool = async (
  name: string,
  args: Record<string, any>,
  userId: string,
): Promise<string> => {
  if (!userId) {
    return JSON.stringify({ ok: false, error: "Usuario no identificado" });
  }

  const tool = tools.find((t) => t.definition.function.name === name);
  if (!tool) {
    return JSON.stringify({ ok: false, error: `Herramienta desconocida: ${name}` });
  }

  return tool.handler(userId, args ?? {});
};
