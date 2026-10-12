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
import { createTransaction } from "@/services/transactionService";
import { recognizeImageText } from "./ocr";
import { extractPdfPages, type PdfPage } from "./pdf";
import { redactSensitiveData } from "./redact";
import {
  parseStatement,
  extractDate,
  detectStatementPeriod,
  detectStatementYear,
  type StatementPeriod,
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
  /** Periodo (rango de fechas) del extracto, si se pudo detectar. */
  period: StatementPeriod | null;
  /** Texto ya redactado por página, para re-parsear al cambiar el periodo. */
  redactedPages: { page: number; text: string }[];
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
  /** Periodo (rango de fechas) detectado del extracto, si se pudo. */
  period: StatementPeriod | null;
  /**
   * Líneas del texto ya redactado agrupadas por página/imagen, para el modo
   * manual de verificación. Cada página se revisa por separado.
   */
  pages: { page: number; lines: string[] }[];
}

/**
 * Crea la sesión de importación parseando CADA página por separado.
 *
 * Antes el extracto completo (todas las páginas pegadas) se parseaba de una
 * sola vez: el estado del parser (bloques de descripción, resúmenes, banderas
 * de corte) se arrastraba entre páginas y se perdían movimientos de páginas
 * 2 y 3. Ahora cada página se redacta y se parsea con estado limpio, y cada
 * movimiento queda etiquetado con su `page` para agruparlo en la verificación.
 *
 * El PERIODO (rango de fechas, p.ej. "31/12/2023 a 13/03/2024") se detecta una
 * sola vez sobre todo el documento y se aplica a todas las páginas, para
 * completar el AÑO lógico de las fechas sin año en cualquier página.
 */
const createSessionFromPages = (
  pages: PdfPage[],
  userId: string,
): ProcessStatementResult => {
  if (!userId) throw new ImportError("Usuario no identificado");
  cleanupSessions();

  const fullText = pages.map((p) => p.text).join("\n");
  const period = detectStatementPeriod(fullText);
  const fallbackYear = detectStatementYear(fullText);

  const candidates: ParsedTransaction[] = [];
  const unparsedLines: string[] = [];
  const sourcePages: ProcessStatementResult["pages"] = [];
  const redactedPages: ImportSession["redactedPages"] = [];

  for (const page of pages) {
    if (!page.text?.trim()) continue;

    // Redacción ANTES de parsear y de mostrar cualquier cosa al usuario.
    const sourceText = redactSensitiveData(page.text);
    const { candidates: pageCandidates, unparsedLines: pageUnparsed } =
      parseStatement(sourceText, { period, year: fallbackYear });

    // Etiqueta la página de origen para agruparla en la verificación.
    for (const c of pageCandidates) c.page = page.page;
    candidates.push(...pageCandidates);
    unparsedLines.push(...pageUnparsed);
    redactedPages.push({ page: page.page, text: sourceText });

    // Líneas ya redactadas por página para el modo manual: si el parseo
    // automático no generó movimientos en una página, el usuario toca las
    // líneas de ESA página que sí son movimientos.
    const lines = sourceText
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (lines.length > 0) sourcePages.push({ page: page.page, lines });
  }

  if (sourcePages.length === 0) {
    throw new ImportError(
      "No se pudo leer texto. Si es un PDF escaneado, usa la cámara o la galería para tomar una foto del extracto.",
    );
  }

  // Respaldo: si un candidato quedó SIN fecha pero su descripción contiene una
  // fecha reconocible (el OCR a veces la pega a la descripción), se recupera
  // usando el mismo periodo del documento.
  for (const c of candidates) {
    if (c.date !== null) continue;
    const embedded = extractDate(c.description, {
      period,
      year: fallbackYear,
    });
    if (embedded) {
      c.date = embedded.value;
      if (c.confidence !== "high") c.confidence = "high";
    }
  }

  const session: ImportSession = {
    id: randomId(),
    userId,
    token: randomToken(),
    createdAt: Date.now(),
    sourceText: fullText,
    period,
    redactedPages,
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
    period,
    pages: sourcePages,
  };
};

/**
 * Registra un candidato añadido manualmente (modo manual de verificación) en
 * la sesión. Mantiene la lista de ids permitidos sincronizada para que el
 * registro posterior valide sin rechazos, respetando el token de sesión.
 */
export const addSessionCandidate = (
  sessionId: string,
  token: string,
  candidate: {
    date: number | null;
    amount: number | null;
    type: ParsedTransactionType;
    description: string;
    confidence: ParsedTransaction["confidence"];
    page?: number;
  },
): string => {
  const session = sessions.get(sessionId);
  if (!session || session.token !== token || session.status !== "pending") {
    throw new ImportError("La sesión de importación no está disponible.");
  }
  const id = `sess_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  session.candidates.push({ page: 1, ...candidate, id });
  return id;
};

/**
 * Cambia el periodo del extracto y re-parsea cada página con el nuevo rango.
 * Solo cambian las FECHAS (el año lógico de las fechas sin año); los ids de
 * los candidatos ya verificados se conservan (se emparejan por página y orden)
 * para no romper la selección ni el registro posterior.
 */
export const setSessionPeriod = (
  sessionId: string,
  token: string,
  period: StatementPeriod | null,
): ParsedTransaction[] => {
  const session = sessions.get(sessionId);
  if (!session || session.token !== token || session.status !== "pending") {
    throw new ImportError("La sesión de importación no está disponible.");
  }
  session.period = period;

  const reParsed: ParsedTransaction[] = [];
  for (const page of session.redactedPages) {
    const { candidates } = parseStatement(page.text, { period });
    for (const c of candidates) c.page = page.page;
    reParsed.push(...candidates);
  }

  const byPage = (list: ParsedTransaction[]) => {
    const map = new Map<number, ParsedTransaction[]>();
    for (const c of list) {
      const arr = map.get(c.page) ?? [];
      arr.push(c);
      map.set(c.page, arr);
    }
    return map;
  };
  const oldByPage = byPage(session.candidates);
  const newByPage = byPage(reParsed);

  const merged: ParsedTransaction[] = [];
  for (const [page, olds] of oldByPage) {
    const news = newByPage.get(page) ?? [];
    olds.forEach((old, i) => {
      const n = news[i];
      if (n && n.date !== null) {
        old.date = n.date;
        if (old.confidence !== "high" && n.confidence === "high") {
          old.confidence = "high";
        }
      }
      merged.push(old);
    });
  }
  session.candidates = merged;
  return session.candidates;
};

export const processStatementImage = async (
  uri: string,
  userId: string,
): Promise<ProcessStatementResult> => {
  const ocr = await recognizeImageText(uri);
  return createSessionFromPages([{ page: 1, text: ocr.text }], userId);
};

export const processStatementPdf = async (
  uri: string,
  userId: string,
): Promise<ProcessStatementResult> => {
  const pages = await extractPdfPages(uri);
  return createSessionFromPages(pages, userId);
};

export interface ImportItem {
  id: string;
  date: number | null;
  amount: number;
  type: ParsedTransactionType | "transfer";
  description: string;
  categoryId: string | null;
  /** "own" = entre tus cuentas, "person" = a otra persona (solo transfer). */
  transferTarget?: "own" | "person" | null;
  /** Cuenta destino cuando la transferencia es entre tus cuentas. */
  destinationAccountId?: string | null;
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
  const accountIds = new Set(accounts.map((a: any) => a.id));

  if (!Array.isArray(items) || items.length === 0) {
    throw new ImportError("No hay movimientos para guardar.");
  }
  if (items.length > MAX_ITEMS) {
    throw new ImportError(`Máximo ${MAX_ITEMS} movimientos por importación.`);
  }

  // Categorías válidas del usuario (para validar el categoryId de cada ítem).
  const categoryRows = await database
    .get("categories")
    .query(Q.where("user_id", userId))
    .fetch();
  const allowedCategoryIds = new Set(categoryRows.map((c: any) => c.id));

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
    const isTransfer = item.type === "transfer";
    const categoryId =
      !isTransfer && item.categoryId && allowedCategoryIds.has(item.categoryId)
        ? item.categoryId
        : null;
    const transferTarget = isTransfer ? item.transferTarget ?? "person" : null;
    const destinationAccountId =
      isTransfer && transferTarget === "own" ? item.destinationAccountId : null;
    if (
      isTransfer &&
      transferTarget === "own" &&
      (!destinationAccountId || !accountIds.has(destinationAccountId))
    ) {
      throw new ImportError(
        "Una transferencia entre tus cuentas requiere una cuenta destino válida.",
      );
    }
    if (isTransfer && destinationAccountId === accountId) {
      throw new ImportError(
        "La cuenta destino de una transferencia debe ser distinta a la cuenta origen.",
      );
    }
    return {
      id: item.id,
      date: item.date ?? Date.now(),
      amount,
      type: (isTransfer
        ? "transfer"
        : item.type === "income"
          ? "income"
          : "expense") as ParsedTransactionType | "transfer",
      description: (item.description || "Movimiento").slice(0, 200),
      categoryId,
      transferTarget,
      destinationAccountId: destinationAccountId ?? null,
    };
  });

  let total = 0;
  for (const item of normalized) {
    await createTransaction({
      userId,
      date: item.date,
      amount: item.amount,
      description: item.description,
      type: item.type,
      accountId,
      destinationAccountId: item.destinationAccountId,
      categoryId: item.categoryId,
      transferTarget: item.transferTarget,
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
