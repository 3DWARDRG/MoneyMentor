// services/ai/import.ts
//
// Orquestación de la importación de extractos bancarios.
//
// Flujo (todo local, la IA nunca ve la imagen ni el texto crudo):
//   1. OCR on-device sobre la imagen.
//   2. Redacción de datos sensibles (números de cuenta, tarjetas, nombres…).
//   3. Parseo local a movimientos candidatos.
//   4. El usuario los VERIFICA y confirma; recién ahí se guardan en la BD.
//
// Las sesiones viven solo en memoria (nunca se persisten). El token de sesión
// es un secreto que solo conoce la UI de verificación local; sin él no se
// puede registrar nada, lo que impide que el modelo de IA escriba datos.

import { Q } from "@nozbe/watermelondb";
import { database } from "@/database";
import { createTransactionRecord } from "@/services/transactionBalanceHelpers";
import { recognizeImageText } from "./ocr";
import { extractPdfText } from "./pdf";
import { redactSensitiveData } from "./redact";
import {
  parseStatement,
  type ParsedTransaction,
  type ParsedTransactionType,
} from "./statementParser";

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_ITEMS = 200;

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

interface ImportSession {
  id: string;
  userId: string;
  token: string;
  createdAt: number;
  sourceText: string;
  candidates: ParsedTransaction[];
  unparsedLines: string[];
  status: "pending" | "completed" | "cancelled";
}

const sessions = new Map<string, ImportSession>();

const cleanupSessions = () => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
};

const randomId = () =>
  `imp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const randomToken = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);

export interface ProcessStatementResult {
  sessionId: string;
  token: string;
  candidates: ParsedTransaction[];
  unparsedLines: string[];
}

const createSessionFromText = (
  text: string,
  userId: string,
): ProcessStatementResult => {
  if (!userId) throw new ImportError("Usuario no identificado");
  cleanupSessions();

  if (!text?.trim()) {
    throw new ImportError(
      "No se pudo leer texto. Si es un PDF escaneado, usa la cámara o la galería para tomar una foto del extracto.",
    );
  }

  // Redacción ANTES de parsear y de mostrar cualquier cosa al usuario.
  const sourceText = redactSensitiveData(text);
  const { candidates, unparsedLines } = parseStatement(sourceText);

  if (candidates.length === 0 && unparsedLines.length === 0) {
    throw new ImportError(
      "No se detectaron movimientos. Prueba con una captura o documento más nítido.",
    );
  }

  const session: ImportSession = {
    id: randomId(),
    userId,
    token: randomToken(),
    createdAt: Date.now(),
    sourceText,
    candidates,
    unparsedLines,
    status: "pending",
  };

  sessions.set(session.id, session);

  return {
    sessionId: session.id,
    token: session.token,
    candidates,
    unparsedLines,
  };
};

export const processStatementImage = async (
  uri: string,
  userId: string,
): Promise<ProcessStatementResult> => {
  const ocr = await recognizeImageText(uri);
  return createSessionFromText(ocr.text, userId);
};

export const processStatementPdf = async (
  uri: string,
  userId: string,
): Promise<ProcessStatementResult> => {
  const text = await extractPdfText(uri);
  return createSessionFromText(text, userId);
};

export interface ImportItem {
  id: string;
  date: number | null;
  amount: number;
  type: ParsedTransactionType;
  description: string;
}

export interface RegisterImportParams {
  userId: string;
  sessionId: string;
  token: string;
  accountId: string;
  items: ImportItem[];
}

export const registerImportedTransactions = async ({
  userId,
  sessionId,
  token,
  accountId,
  items,
}: RegisterImportParams): Promise<{ count: number; total: number }> => {
  const session = sessions.get(sessionId);
  if (!session) throw new ImportError("La sesión de importación ya no existe.");
  if (session.userId !== userId) throw new ImportError("Sesión inválida.");
  if (session.status !== "pending") {
    throw new ImportError("La sesión ya fue procesada.");
  }
  if (session.token !== token) {
    throw new ImportError("Verificación de la sesión inválida.");
  }
  if (!accountId) throw new ImportError("Selecciona la cuenta de destino.");

  const accounts = await database
    .get("accounts")
    .query(Q.where("user_id", userId))
    .fetch();
  const account = accounts.find((a: any) => a.id === accountId);
  if (!account) throw new ImportError("La cuenta seleccionada no existe.");

  if (!Array.isArray(items) || items.length === 0) {
    throw new ImportError("No hay movimientos para guardar.");
  }
  if (items.length > MAX_ITEMS) {
    throw new ImportError(`Máximo ${MAX_ITEMS} movimientos por importación.`);
  }

  // Validación completa ANTES de escribir nada, para no guardar a medias.
  const allowedIds = new Set(session.candidates.map((c) => c.id));
  const normalized = items.map((item) => {
    if (!allowedIds.has(item.id)) {
      throw new ImportError("Se intentó guardar un movimiento no verificado.");
    }
    const amount = Math.abs(Number(item.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ImportError("Un movimiento tiene un valor inválido.");
    }
    return {
      id: item.id,
      date: item.date ?? Date.now(),
      amount,
      type: (item.type === "income" ? "income" : "expense") as ParsedTransactionType,
      description: (item.description || "Movimiento").slice(0, 200),
    };
  });

  let total = 0;
  for (const item of normalized) {
    await createTransactionRecord({
      userId,
      date: item.date,
      amount: item.amount,
      description: item.description,
      type: item.type,
      accountId,
      destinationAccountId: null,
      categoryId: null,
      transferTarget: null,
      installmentsTotal: null,
      installmentsPaid: null,
      feeType: null,
    });
    total += item.amount;
  }

  session.status = "completed";

  return { count: normalized.length, total };
};

export const cancelImportSession = (
  sessionId: string,
  token: string,
): void => {
  const session = sessions.get(sessionId);
  if (session && session.token === token) {
    session.status = "cancelled";
    sessions.delete(sessionId);
  }
};

export interface ImportSummary {
  ok: boolean;
  active: boolean;
  totalCandidates: number;
  incomeCount: number;
  expenseCount: number;
  incomeTotal: string;
  expenseTotal: string;
  unparsedLineCount: number;
  error?: string;
}

/**
 * Resumen AGREGADO de la sesión activa para el asistente. Devuelve solo
 * conteos y totales formateados: nunca descripciones, fechas ni datos
 * individuales. Si no hay sesión, "active: false".
 */
export const getActiveImportSummary = (userId: string): ImportSummary => {
  cleanupSessions();
  const session = [...sessions.values()]
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .find((s) => s.status === "pending" || s.status === "completed");

  if (!session) {
    return {
      ok: true,
      active: false,
      totalCandidates: 0,
      incomeCount: 0,
      expenseCount: 0,
      incomeTotal: "0",
      expenseTotal: "0",
      unparsedLineCount: 0,
    };
  }

  let incomeTotal = 0;
  let expenseTotal = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const c of session.candidates) {
    if (c.type === "income") {
      incomeCount += 1;
      incomeTotal += c.amount ?? 0;
    } else {
      expenseCount += 1;
      expenseTotal += Math.abs(c.amount ?? 0);
    }
  }

  return {
    ok: true,
    active: true,
    totalCandidates: session.candidates.length,
    incomeCount,
    expenseCount,
    incomeTotal: formatCOP(incomeTotal),
    expenseTotal: formatCOP(expenseTotal),
    unparsedLineCount: session.unparsedLines.length,
  };
};
