// store/useImportStore.ts
//
// Estado de la importación de extractos: candidatos extraídos por OCR local,
// edición, verificación del usuario y confirmación. Todo vive en memoria
// (nada se persiste) y el texto del documento jamás se envía a la IA.

import { Q } from "@nozbe/watermelondb";
import { database } from "@/database";
import {
  cancelImportSession,
  processStatementImage,
  processStatementPdf,
  registerImportedTransactions,
} from "@/services/ai/import";
import { parseMoney } from "@/services/ai/statementParser";
import type { ParsedTransactionType } from "@/services/ai/statementParser";
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

  startImport: (uri: string, kind: ImportKind, userId: string) => Promise<void>;
  toggleCandidate: (id: string) => void;
  updateCandidate: (id: string, patch: Partial<ImportCandidate>) => void;
  setAccountId: (id: string) => void;
  confirm: (userId: string) => Promise<{ count: number; total: number } | null>;
  cancel: () => void;
  clearError: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

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
};

export const useImportStore = create<ImportState>((set, get) => ({
  ...resetState,

  startImport: async (uri, kind, userId) => {
    if (!userId) {
      set({ error: "Inicia sesión para importar movimientos." });
      return;
    }
    set({ processing: true, error: null, active: false });

    try {
      const result =
        kind === "pdf"
          ? await processStatementPdf(uri, userId)
          : await processStatementImage(uri, userId);
      const accounts = await fetchAccounts(userId);

      if (accounts.length === 0) {
        cancelImportSession(result.sessionId, result.token);
        set({
          active: false,
          processing: false,
          error: "Primero crea una cuenta para poder importar movimientos.",
        });
        return;
      }

      const candidates: ImportCandidate[] = result.candidates.map((c) => ({
        ...c,
        selected: true,
        dateText: c.date ? formatDateText(c.date) : "",
        amountText: c.amount != null ? String(c.amount) : "",
      }));

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
      });
    } catch (error: any) {
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

  setAccountId: (accountId) => set({ accountId }),

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
    const { sessionId, token } = get();
    if (sessionId && token) cancelImportSession(sessionId, token);
    set({ ...resetState });
  },

  clearError: () => set({ error: null }),
}));
