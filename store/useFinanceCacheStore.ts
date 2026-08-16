import { database } from "@/database";
import { Q } from "@nozbe/watermelondb";
import { create } from "zustand";

export interface CachedAccount {
  id: string;
  name: string;
  iconImage: string | null;
  balance: number;
  currency: string;
  type: string | null;
  creditSubtype: string | null;
}

export interface CachedCategory {
  id: string;
  name: string;
  iconImage: string | null;
  type: string;
}

interface FinanceCacheState {
  accounts: CachedAccount[];
  categories: CachedCategory[];
  loading: boolean;
  loadedForUserId: string | null;
  unsubscribe: (() => void) | null;
  load: (userId: string) => Promise<void>;
  reset: () => void;
}

const ACCOUNT_COLUMNS = [
  "name",
  "balance",
  "type",
  "credit_subtype",
  "currency",
  "is_active",
  "icon_image",
];

const formatAccounts = (records: any[]): CachedAccount[] =>
  records
    .filter((acc: any) => acc.isActive !== false)
    .map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      iconImage: acc.iconImage ?? null,
      balance: acc.balance ?? 0,
      currency: acc.currency ?? "COP",
      type: acc.type ?? null,
      creditSubtype: acc.creditSubtype ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

const formatCategories = (records: any[]): CachedCategory[] =>
  records.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    iconImage: cat.iconImage ?? null,
    type: cat.type,
  }));

export const useFinanceCacheStore = create<FinanceCacheState>((set, get) => ({
  accounts: [],
  categories: [],
  loading: false,
  loadedForUserId: null,
  unsubscribe: null,

  load: async (userId) => {
    if (!userId) return;
    const { loadedForUserId, unsubscribe } = get();

    if (
      loadedForUserId === userId &&
      get().accounts.length + get().categories.length > 0
    ) {
      return;
    }

    unsubscribe?.();

    const catsCollection = database.get("categories");
    const accsCollection = database.get("accounts");

    const subscribe = () => {
      const subs = [
        catsCollection
          .query(Q.where("user_id", userId))
          .observe()
          .subscribe({
            next: (records: any) =>
              set({ categories: formatCategories(records) }),
          }),
        accsCollection
          .query(Q.where("user_id", userId))
          .observeWithColumns(ACCOUNT_COLUMNS)
          .subscribe({
            next: (records: any) => set({ accounts: formatAccounts(records) }),
          }),
      ];
      set({ unsubscribe: () => subs.forEach((s) => s.unsubscribe()) });
    };

    set({ loading: true, loadedForUserId: userId });

    try {
      const [cats, accs] = await Promise.all([
        catsCollection.query(Q.where("user_id", userId)).fetch(),
        accsCollection.query(Q.where("user_id", userId)).fetch(),
      ]);

      set({
        categories: formatCategories(cats),
        accounts: formatAccounts(accs),
      });
      subscribe();
    } catch (error) {
      console.error("❌ Error cargando caché de finanzas:", error);
    } finally {
      set({ loading: false });
    }
  },

  reset: () => {
    get().unsubscribe?.();
    set({
      accounts: [],
      categories: [],
      loading: false,
      loadedForUserId: null,
      unsubscribe: null,
    });
  },
}));
