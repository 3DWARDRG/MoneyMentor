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
  isOutgoingTransferDescription,
  extractMentionedBank,
  type StatementPeriod,
  type ParsedTransactionType,
} from "@/services/ai/statementParser";
import {
  getMerchantLearning,
  getMerchantLearningsByKeys,
  learnFromConfirmedItems,
  normalizeMerchant,
  type MerchantLearningRow,
} from "@/services/merchantLearning";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceCacheStore, type CachedCategory } from "@/store/useFinanceCacheStore";
import { create } from "zustand";

export type ImportKind = "image" | "pdf";

export type ImportCandidateType = ParsedTransactionType | "transfer";
export type TransferTarget = "own" | "person";

export interface ImportCandidate {
  id: string;
  date: number | null;
  amount: number | null;
  type: ImportCandidateType;
  description: string;
  confidence: "high" | "medium" | "low";
  selected: boolean;
  dateText: string;
  amountText: string;
  categoryId: string | null;
  /** Página (o imagen) del extracto de la que proviene. */
  page: number;
  /** "own" = transferencia entre tus cuentas, "person" = a otra persona. */
  transferTarget: TransferTarget | null;
  /** Cuenta destino cuando la transferencia es entre tus cuentas. */
  destinationAccountId: string | null;
  /** Nombre de la persona destinataria cuando no es una cuenta tuya. */
  personName: string;
  /**
   * Clave de comercio (normalizada) calculada UNA vez al crear el candidato,
   * a partir de la descripción ORIGINAL del OCR. Se usa para agrupar en la
   * verificación de forma ESTABLE: editar la descripción no mueve el
   * movimiento de grupo.
   */
  merchantKey: string | null;
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
  { name: "Domicilios", type: "expense", words: ["domicilio", "rappic", "uber eats", "pedidos ya", "didifood", "ifood", "delivery"] },
  { name: "Gasolina", type: "expense", words: ["gasolina", "terpel", "primax", "petrobras", "combustible"] },
  { name: "Transporte", type: "expense", words: ["uber", "taxi", "transmilenio", "transporte", "rides", "cabify", "diditaxi", "movil"] },
  { name: "Arriendo", type: "expense", words: ["arriendo", "canon", "leasing"] },
  { name: "Impuestos", type: "expense", words: ["impuesto", "dian", "iva", "retencion", "predial", "renta", "fiscal", "tributo"] },
  { name: "Servicios", type: "expense", words: ["servicios", "energia", "agua", "luz", "internet", "celular", "claro", "movistar", "tigo", "wom", "publicos", "comision", "cuota de manejo"] },
  { name: "Mascotas", type: "expense", words: ["mascota", "veterinaria", "veterinario", "dog", "pet", "zoologico"] },
  { name: "Suscripciones", type: "expense", words: ["suscripcion", "membresia", "netflix", "spotify", "disney", "prime video", "hbo", "paramount", "apple music", "crunchyroll", "youtube premium", "max"] },
  { name: "Entretenimiento", type: "expense", words: ["cine", "playstation", "steam", "g2a", "gog", "entertainment", "parque"] },
  { name: "Eventos", type: "expense", words: ["concierto", "festival", "teatro", "bowling", "evento"] },
  { name: "Entradas", type: "expense", words: ["boleta", "entrada", "ticket"] },
  { name: "Compras", type: "expense", words: ["amazon", "mercadolibre", "alkosto", "linio", "shein", "temu", "aliexpress", "ebay"] },
  { name: "Salud", type: "expense", words: ["farmacia", "drogueria", "salud", "medico", "eps", "hospital", "clinica", "farma"] },
  { name: "Educación", type: "expense", words: ["universidad", "colegio", "educacion", "curso", "platzi", "libro"] },
  { name: "Gimnasio", type: "expense", words: ["gym", "gimnasio", "bodytech", "fitness"] },
  { name: "Ropa", type: "expense", words: ["zara", "h&m", "ropa", "calzado", "levis", "falabella"] },
  { name: "Viajes", type: "expense", words: ["vuelo", "avianca", "latam", "hotel", "viaje", "booking", "airbnb", "hostel", "expedia", "despegar"] },
  { name: "Salario", type: "income", words: ["nomina", "salario", "sueldo"] },
  { name: "Bonificación", type: "income", words: ["bonificacion", "cesantias", "aguinaldo"] },
  { name: "Dividendos", type: "income", words: ["dividendo", "accion", "acciones", "etf"] },
  { name: "Intereses", type: "income", words: ["interes", "intereses", "rendimiento", "causacion"] },
  { name: "Cripto", type: "income", words: ["cripto", "bitcoin", "btc", "ethereum", "eth", "binance", "criptomoneda"] },
  { name: "Premio", type: "income", words: ["premio", "sorteo", "loteria", "raffle"] },
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

// ---------------------------------------------------------------------------
// Aplica el diccionario aprendido (machine learning simulado) a un candidato:
// si el usuario ya asignó descripción/categoría/tipo a ese comercio antes, se
// reutilizan. La categoría aprendida solo aplica si sigue existiendo.
// ---------------------------------------------------------------------------
const applyLearning = (
  input: {
    description: string;
    type: ParsedTransactionType;
    categoryId: string | null;
  },
  learning: MerchantLearningRow | undefined,
  categories: CachedCategory[],
): {
  description: string;
  type: ParsedTransactionType | "transfer";
  categoryId: string | null;
} => {
  if (!learning) {
    return {
      description: input.description,
      type: input.type,
      categoryId: input.categoryId,
    };
  }

  const learnedType =
    learning.type === "income" ||
    learning.type === "expense" ||
    learning.type === "transfer"
      ? learning.type
      : input.type;

  const categoryStillExists = categories.some(
    (c) => c.id === learning.categoryId,
  );

  return {
    description: learning.description?.trim() || input.description,
    type: learnedType,
    categoryId:
      categoryStillExists && learning.categoryId
        ? learning.categoryId
        : input.categoryId,
  };
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

      // Diccionario aprendido: pre-llenar con lo que el usuario ya asignó a
      // estos comercios en importaciones anteriores (machine learning local).
      const merchantKeys = result.candidates.map((c) =>
        normalizeMerchant(c.description),
      );
      const learnings = await getMerchantLearningsByKeys(userId, merchantKeys);

      // Respaldo final de fechas: si un candidato llegó sin fecha pero su
      // descripción trae una fecha reconocible (el OCR a veces la pega a la
      // descripción), se resuelve con el periodo del documento.
      const dateOpts = result.period
        ? { period: result.period }
        : undefined;
      const candidates: ImportCandidate[] = result.candidates.map((c) => {
        const merchantKey = normalizeMerchant(c.description);
        const learning = merchantKey
          ? learnings[merchantKey]
          : undefined;
        const guessed = applyLearning(
          {
            description: c.description,
            type: c.type,
            categoryId: guessCategoryId(c.description, c.type, categories),
          },
          learning,
          categories,
        );

        let date = c.date;
        let confidence = c.confidence;
        if (date === null && dateOpts) {
          const embedded = extractDate(guessed.description, dateOpts);
          if (embedded) {
            date = embedded.value;
            confidence = "high";
          }
        }
        // Una descripción de transferencia saliente ("Transferio a: …",
        // "Transferencia a: …") se marca como transferencia para que el
        // usuario elija la cuenta destino (entre sus cuentas o una persona).
        const isTransfer =
          guessed.type === "transfer" ||
          isOutgoingTransferDescription(guessed.description);
        // Si la descripción menciona un banco ("Transferencia a: Bancolombia")
        // y el usuario tiene una cuenta de ese banco, se pre-selecciona como
        // destino (transferencia entre sus cuentas).
        let transferTarget: TransferTarget | null = isTransfer ? "person" : null;
        let destinationAccountId: string | null = null;
        if (isTransfer) {
          const mentioned = extractMentionedBank(guessed.description);
          if (mentioned) {
            const normBank = mentioned.toLowerCase();
            const match = accounts.find(
              (a) =>
                a.id !== (accounts[0]?.id ?? null) &&
                a.name.toLowerCase().includes(normBank),
            );
            if (match) {
              transferTarget = "own";
              destinationAccountId = match.id;
            }
          }
        }
        return {
          ...c,
          description: guessed.description,
          merchantKey,
          date,
          confidence,
          selected: true,
          dateText: date ? formatDateText(date) : "",
          amountText: c.amount != null ? String(c.amount) : "",
          type: isTransfer ? "transfer" : guessed.type,
          categoryId: isTransfer ? null : guessed.categoryId,
          transferTarget,
          destinationAccountId,
          personName: "",
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

    // Diccionario aprendido: aplica descripción/categoría/tipo ya asignados a
    // este comercio en importaciones anteriores.
    const categories = useFinanceCacheStore.getState().categories;
    const userId = useAuthStore.getState().userId;
    const merchantKey = normalizeMerchant(parsed.description);
    const learning = userId && merchantKey
      ? await getMerchantLearning(userId, merchantKey)
      : null;
    const guessed = applyLearning(
      {
        description: parsed.description,
        type: parsed.type,
        categoryId: guessCategoryId(parsed.description, parsed.type, categories),
      },
      learning ?? undefined,
      categories,
    );

    const isTransfer =
      guessed.type === "transfer" ||
      isOutgoingTransferDescription(guessed.description);
    set((state) => ({
      candidates: [
        ...state.candidates,
        {
          id,
          date: parsed.date,
          amount: parsed.amount,
          type: isTransfer ? "transfer" : guessed.type,
          description: guessed.description,
          merchantKey: normalizeMerchant(parsed.description),
          confidence: parsed.confidence,
          selected: true,
          dateText: parsed.date ? formatDateText(parsed.date) : "",
          amountText: parsed.amount != null ? String(parsed.amount) : "",
          categoryId: isTransfer ? null : guessed.categoryId,
          page: pageOfLine,
          transferTarget: isTransfer ? "person" : null,
          destinationAccountId: null,
          personName: "",
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
          merchantKey: null,
          confidence: "low",
          selected: true,
          dateText: "",
          amountText: "",
          categoryId: null,
          page: 1,
          transferTarget: null,
          destinationAccountId: null,
          personName: "",
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
      const categories = useFinanceCacheStore.getState().categories;
      const userId = useAuthStore.getState().userId;
      const merchantKeys = updated.map((c) => normalizeMerchant(c.description));
      const learnings = await getMerchantLearningsByKeys(userId ?? "", merchantKeys);

      const candidates = updated.map((c, i) => {
        const prev = previousById.get(c.id);
        const learning = merchantKeys[i]
          ? learnings[merchantKeys[i] as string]
          : undefined;
        const guessed = prev
          ? { description: prev.description, type: c.type as ParsedTransactionType, categoryId: prev.categoryId }
          : applyLearning(
              {
                description: c.description,
                type: c.type,
                categoryId: guessCategoryId(c.description, c.type, categories),
              },
              learning,
              categories,
            );
        // Si el usuario ya marcó el movimiento como transferencia, se conserva
        // el estado (cuenta destino / persona) que eligió en la verificación.
        const isTransfer = prev?.type === "transfer"
          ? true
          : guessed.type === "transfer" ||
            isOutgoingTransferDescription(guessed.description);
        const type: ImportCandidateType = isTransfer ? "transfer" : guessed.type;
        return {
          id: c.id,
          date: c.date,
          amount: c.amount,
          type,
          description: prev?.description ?? guessed.description,
          merchantKey: prev?.merchantKey ?? normalizeMerchant(c.description),
          confidence: c.confidence,
          selected: prev?.selected ?? true,
          dateText: c.date ? formatDateText(c.date) : (prev?.dateText ?? ""),
          amountText:
            prev?.amountText ?? (c.amount != null ? String(c.amount) : ""),
          categoryId: isTransfer
            ? null
            : prev?.categoryId ?? guessed.categoryId,
          page: c.page,
          transferTarget: prev?.transferTarget ?? (isTransfer ? "person" : null),
          destinationAccountId: prev?.destinationAccountId ?? null,
          personName: prev?.personName ?? "",
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
      const items = selected.map((c) => {
        const isTransfer = c.type === "transfer";
        const accountOptions = get().accounts;
        let description = c.description.trim();
        let categoryId = c.categoryId ?? null;

        if (isTransfer) {
          // Las transferencias no llevan categoría.
          categoryId = null;
          const ownAccount = accountOptions.find(
            (a) => a.id === c.destinationAccountId,
          );
          if (c.transferTarget === "own" && ownAccount) {
            description = `Transferencia a ${ownAccount.name}`;
          } else if (
            c.transferTarget === "person" &&
            c.personName.trim()
          ) {
            description = `Transferencia a ${c.personName.trim()}`;
          }
        }

        return {
          id: c.id,
          date: parseDateText(c.dateText),
          // El monto de una transferencia siempre se guarda positivo: sale de
          // la cuenta origen y (si es entre tus cuentas) entra a la destino.
          amount: isTransfer
            ? Math.abs(parseMoney(c.amountText) ?? Math.abs(c.amount ?? 0))
            : parseMoney(c.amountText) ?? c.amount ?? 0,
          type: c.type,
          description,
          categoryId,
          transferTarget: isTransfer ? c.transferTarget : null,
          destinationAccountId:
            isTransfer && c.transferTarget === "own"
              ? c.destinationAccountId
              : null,
        };
      });

      const result = await registerImportedTransactions({
        userId,
        sessionId,
        token,
        accountId,
        items,
      });

      // Aprende del resultado confirmado: el diccionario local se actualiza
      // con la descripción/categoría/tipo que el usuario dejó a cada comercio.
      try {
        await learnFromConfirmedItems(
          userId,
          items.map((item) => ({
            description: item.description,
            type: item.type,
            categoryId: item.categoryId,
          })),
        );
      } catch (learnError) {
        console.error("❌ Error aprendiendo comercios:", learnError);
      }

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
