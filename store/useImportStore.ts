// store/useImportStore.ts
//
// Estado de la importación de extractos: candidatos extraídos por OCR local,
// edición, verificación del usuario y confirmación. Todo vive en memoria
// (nada se persiste) y el texto del documento jamás se envía a la IA.

import { Q } from "@nozbe/watermelondb";
import { database } from "@/database";
import {
  addSessionCandidate,
  cancelImportSession,
  processStatementImage,
  processStatementPdf,
  registerImportedTransactions,
  setSessionPeriod,
} from "@/services/ai/import";
import {
  parseLine,
  parseMoney,
  extractDate,
  type StatementPeriod,
} from "@/services/ai/statementParser";
import type { ParsedTransactionType } from "@/services/ai/statementParser";
import { useFinanceCacheStore, type CachedCategory } from "@/store/useFinanceCacheStore";
import { create } from "zustand";

export type ImportKind = "image" | "pdf";

export interface ImportCandidate {
  id: string;
  date: number | null;
  amount: number | null;
  type: ParsedTransactionType;
  description: string;
  confidence: "high" | "medium" | "low";
  selected: boolean;
  dateText: string;
  amountText: string;
  categoryId: string | null;
  /** Página (o imagen) del extracto de la que proviene. */
  page: number;
}

interface AccountOption {
  id: string;
  name: string;
  type: string | null;
}

interface ImportState {
  active: boolean;
  processing: boolean;
  saving: boolean;
  error: string | null;
  candidates: ImportCandidate[];
  unparsedCount: number;
  sessionId: string | null;
  token: string | null;
  accountId: string | null;
  accounts: AccountOption[];
  /**
   * Líneas del texto ya redactado agrupadas por página/imagen, para el modo
   * manual de verificación. Cada página se revisa y agrupa por separado.
   */
  pages: { page: number; lines: string[] }[];
  /** Periodo (rango de fechas) del extracto, si se pudo detectar. */
  period: StatementPeriod | null;

  startImport: (uri: string, kind: ImportKind, userId: string) => Promise<void>;
  toggleCandidate: (id: string) => void;
  updateCandidate: (id: string, patch: Partial<ImportCandidate>) => void;
  /** Modo manual: convierte una línea tocada en un candidato editable. */
  addFromLine: (line: string) => Promise<void>;
  /** Modo manual: agrega un movimiento en blanco para llenar a mano. */
  addManual: () => Promise<void>;
  setAccountId: (id: string) => void;
  /**
   * Actualiza el periodo del extracto y re-parsea los movimientos para
   * corregir el año lógico de las fechas sin año (p.ej. cruce de año).
   */
  setPeriod: (from: number, to: number) => Promise<void>;
  confirm: (userId: string) => Promise<{ count: number; total: number } | null>;
  cancel: () => void;
  clearError: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Contador de secuencia de importaciones: cada `startImport` toma un número y
// solo aplica su resultado si sigue siendo el último. Así, si el usuario
// cancela o lanza otra importación mientras una anterior sigue procesando,
// el resultado viejo no pisa el estado (spinner, candidatos) de la nueva.
let importSeq = 0;

export const formatDateText = (ms: number): string => {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const parseDateText = (text: string): number | null => {
  const m = text.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12) return null;
  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) return null;
  return new Date(year, month - 1, day).getTime();
};

const fetchAccounts = async (userId: string): Promise<AccountOption[]> => {
  const rows = await database
    .get("accounts")
    .query(Q.where("user_id", userId))
    .fetch();
  return rows.map((a: any) => ({
    id: a.id,
    name: a.name ?? "Cuenta",
    type: a.type ?? "savings",
  }));
};

// ---------------------------------------------------------------------------
// Categoría por defecto según la descripción del movimiento. Como los nombres
// de los comercios casi no cambian, basta con mapear palabras clave; el
// usuario siempre puede cambiarla en la verificación. Usa las categorías del
// caché de finanzas (fuente única), no una consulta adicional.
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS: {
  name: string;
  type: "income" | "expense";
  words: string[];
}[] = [
  { name: "Supermercado", type: "expense", words: ["d1", "supermercado", "mercado", "metro", "ara", "exito", "jumbo", "carulla", "olimpica", "surtimax", "makro", "tienda", "zipaquira la"] },
  { name: "Comida", type: "expense", words: ["restaurante", "pizza", "hamburguesa", "burger", "comida", "panaderia", "corral", "cocina", "asados", "pollo", "frisby", "crepes", "donde"] },
  { name: "Café", type: "expense", words: ["starbucks", "juan valdez", "tinto", "cafe"] },
  { name: "Transporte", type: "expense", words: ["uber", "taxi", "transmilenio", "transporte", "rides", "cabify", "diditaxi", "gasolina", "terpel", "movil"] },
  { name: "Entretenimiento", type: "expense", words: ["cine", "netflix", "spotify", "playstation", "steam", "g2a", "gog", "entertainment", "parque", "prime video"] },
  { name: "Salud", type: "expense", words: ["farmacia", "drogueria", "salud", "medico", "eps", "hospital", "clinica", "farma"] },
  { name: "Servicios", type: "expense", words: ["servicios", "energia", "agua", "luz", "internet", "celular", "claro", "movistar", "tigo", "wom", "publicos", "impuesto", "comision", "cuota de manejo"] },
  { name: "Educación", type: "expense", words: ["universidad", "colegio", "educacion", "curso", "platzi", "libro"] },
  { name: "Gimnasio", type: "expense", words: ["gym", "gimnasio", "bodytech", "fitness"] },
  { name: "Ropa", type: "expense", words: ["zara", "h&m", "ropa", "calzado", "levis", "falabella"] },
  { name: "Salario", type: "income", words: ["nomina", "salario", "sueldo"] },
  { name: "Reembolso", type: "income", words: ["devolucion", "reembolso", "ajuste a favor"] },
];

const normalizeForCategory = (s: string) =>
  s
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[ñ]/g, "n");

const guessCategoryId = (
  description: string,
  type: ParsedTransactionType,
  categories: CachedCategory[],
): string | null => {
  const desc = normalizeForCategory(description ?? "");
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.type !== type) continue;
    if (rule.words.some((w) => desc.includes(w))) {
      const cat = categories.find(
        (c) => c.name === rule.name && c.type === type,
      );
      if (cat) return cat.id;
    }
  }
  return null;
};

const resetState = {
  active: false,
  processing: false,
  saving: false,
  error: null,
  candidates: [],
  unparsedCount: 0,
  sessionId: null,
  token: null,
  accountId: null,
  accounts: [],
  pages: [],
  period: null,
};

export const useImportStore = create<ImportState>((set, get) => ({
  ...resetState,

  startImport: async (uri, kind, userId) => {
    if (!userId) {
      set({ error: "Inicia sesión para importar movimientos." });
      return;
    }
    const seq = ++importSeq;
    set({ processing: true, error: null, active: false });

    try {
      const result =
        kind === "pdf"
          ? await processStatementPdf(uri, userId)
          : await processStatementImage(uri, userId);
      // Ya no es la importación vigente (se canceló o se lanzó otra).
      if (seq !== importSeq) {
        if (result?.sessionId && result?.token) {
          cancelImportSession(result.sessionId, result.token);
        }
        return;
      }
      const accounts = await fetchAccounts(userId);

      // Pudo llegar un cancel mientras se cargaban las cuentas.
      if (seq !== importSeq) {
        cancelImportSession(result.sessionId, result.token);
        return;
      }

      if (accounts.length === 0) {
        cancelImportSession(result.sessionId, result.token);
        set({
          active: false,
          processing: false,
          error: "Primero crea una cuenta para poder importar movimientos.",
        });
        return;
      }

      // Categorías desde el caché de finanzas (fuente única). Se asegura de
      // que esté cargado antes de adivinar la categoría por defecto.
      await useFinanceCacheStore.getState().load(userId);
      const categories = useFinanceCacheStore.getState().categories;

      // Respaldo final de fechas: si un candidato llegó sin fecha pero su
      // descripción trae una fecha reconocible (el OCR a veces la pega a la
      // descripción), se resuelve con el periodo del documento.
      const dateOpts = result.period
        ? { period: result.period }
        : undefined;
      const candidates: ImportCandidate[] = result.candidates.map((c) => {
        let date = c.date;
        let confidence = c.confidence;
        if (date === null && dateOpts) {
          const embedded = extractDate(c.description, dateOpts);
          if (embedded) {
            date = embedded.value;
            confidence = "high";
          }
        }
        return {
          ...c,
          date,
          confidence,
          selected: true,
          dateText: date ? formatDateText(date) : "",
          amountText: c.amount != null ? String(c.amount) : "",
          categoryId: guessCategoryId(c.description, c.type, categories),
        };
      });

      // Segunda verificación: entre el OCR y este punto pudo llegar un cancel.
      if (seq !== importSeq) {
        cancelImportSession(result.sessionId, result.token);
        return;
      }

      set({
        active: true,
        processing: false,
        error: null,
        candidates,
        unparsedCount: result.unparsedLines.length,
        sessionId: result.sessionId,
        token: result.token,
        accountId: accounts[0]?.id ?? null,
        accounts,
        pages: result.pages,
        period: result.period,
      });
    } catch (error: any) {
      // Un error de una importación obsoleta no debe tocar el estado actual.
      if (seq !== importSeq) return;
      set({
        active: false,
        processing: false,
        error: error?.message ?? "No se pudo procesar la imagen.",
      });
    }
  },

  toggleCandidate: (id) =>
    set((state) => ({
      candidates: state.candidates.map((c) =>
        c.id === id ? { ...c, selected: !c.selected } : c,
      ),
    })),

  updateCandidate: (id, patch) =>
    set((state) => ({
      candidates: state.candidates.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    })),

  addFromLine: async (line) => {
    const { sessionId, token, pages } = get();
    if (!sessionId || !token) return;
    const parsed = parseLine(line);
    if (!parsed) return;

    // Página de la que proviene la línea (para agruparla en la verificación).
    const pageOfLine = pages.find((p) => p.lines.includes(line))?.page ?? 1;

    let id: string;
    try {
      id = addSessionCandidate(sessionId, token, {
        date: parsed.date,
        amount: parsed.amount,
        type: parsed.type,
        description: parsed.description,
        confidence: parsed.confidence,
        page: pageOfLine,
      });
    } catch (error: any) {
      set({ error: error?.message ?? "La sesión ya no está disponible." });
      return;
    }

    const nextPages = pages
      .map((p) => ({
        ...p,
        lines: p.lines.filter((l) => l !== line),
      }))
      .filter((p) => p.lines.length > 0);

    set((state) => ({
      candidates: [
        ...state.candidates,
        {
          id,
          date: parsed.date,
          amount: parsed.amount,
          type: parsed.type,
          description: parsed.description,
          confidence: parsed.confidence,
          selected: true,
          dateText: parsed.date ? formatDateText(parsed.date) : "",
          amountText: parsed.amount != null ? String(parsed.amount) : "",
          categoryId: guessCategoryId(
            parsed.description,
            parsed.type,
            useFinanceCacheStore.getState().categories,
          ),
          page: pageOfLine,
        },
      ],
      pages: nextPages,
    }));
  },

  addManual: async () => {
    const { sessionId, token } = get();
    if (!sessionId || !token) return;

    let id: string;
    try {
      id = addSessionCandidate(sessionId, token, {
        date: null,
        amount: null,
        type: "expense",
        description: "",
        confidence: "low",
      });
    } catch (error: any) {
      set({ error: error?.message ?? "La sesión ya no está disponible." });
      return;
    }

    set((state) => ({
      candidates: [
        ...state.candidates,
        {
          id,
          date: null,
          amount: null,
          type: "expense",
          description: "",
          confidence: "low",
          selected: true,
          dateText: "",
          amountText: "",
          categoryId: null,
          page: 1,
        },
      ],
    }));
  },

  setAccountId: (accountId) => set({ accountId }),

  setPeriod: async (from, to) => {
    const { sessionId, token } = get();
    if (!sessionId || !token) return;

    const period: StatementPeriod = {
      from,
      to,
      fromText: formatDateText(from),
      toText: formatDateText(to),
    };

    try {
      const updated = setSessionPeriod(sessionId, token, period);

      // Reconstruye los candidatos conservando la selección y los campos que
      // el usuario ya editó (descripción, monto, categoría…); solo cambia la
      // fecha, que es lo que re-parsea el nuevo periodo.
      const previousById = new Map(get().candidates.map((c) => [c.id, c]));
      const candidates = updated.map((c) => {
        const prev = previousById.get(c.id);
        return {
          id: c.id,
          date: c.date,
          amount: c.amount,
          type: c.type,
          description: c.description,
          confidence: c.confidence,
          selected: prev?.selected ?? true,
          dateText: c.date ? formatDateText(c.date) : (prev?.dateText ?? ""),
          amountText:
            prev?.amountText ?? (c.amount != null ? String(c.amount) : ""),
          categoryId:
            prev?.categoryId ??
            guessCategoryId(
              c.description,
              c.type,
              useFinanceCacheStore.getState().categories,
            ),
          page: c.page,
        };
      });

      set({ period, candidates });
    } catch (error: any) {
      set({ error: error?.message ?? "No se pudo actualizar el periodo." });
    }
  },

  confirm: async (userId) => {
    const { candidates, sessionId, token, accountId, saving } = get();
    if (saving || !sessionId || !token) return null;

    const selected = candidates.filter((c) => c.selected);
    if (selected.length === 0) {
      set({ error: "Selecciona al menos un movimiento." });
      return null;
    }
    if (!accountId) {
      set({ error: "Selecciona la cuenta de destino." });
      return null;
    }

    set({ saving: true, error: null });

    try {
      const items = selected.map((c) => ({
        id: c.id,
        date: parseDateText(c.dateText),
        amount: parseMoney(c.amountText) ?? c.amount ?? 0,
        type: c.type,
        description: c.description.trim(),
        categoryId: c.categoryId ?? null,
      }));

      const result = await registerImportedTransactions({
        userId,
        sessionId,
        token,
        accountId,
        items,
      });

      set({ ...resetState });
      return result;
    } catch (error: any) {
      set({
        saving: false,
        error: error?.message ?? "No se pudo guardar los movimientos.",
      });
      return null;
    }
  },

  cancel: () => {
    // Invalida cualquier importación en curso para que su resultado no toque
    // el estado después del reinicio.
    importSeq += 1;
    const { sessionId, token } = get();
    if (sessionId && token) cancelImportSession(sessionId, token);
    set({ ...resetState });
  },

  clearError: () => set({ error: null }),
}));
