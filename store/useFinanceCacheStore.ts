import { database } from "@/database";
import { Account } from "@/database/models/mlAccount";
import { Category } from "@/database/models/mlCategory";
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
  isActive: boolean | null;
  creditLimit: number | null;
  institution: string | null;
  statementClosingDay: number | null;
  paymentDueDay: number | null;
  aprAnnual: number | null;
  aprMonthly: number | null;
  cardLast4: string | null;

}

export interface CachedCategory {
  id: string;
  name: string;
  iconImage: string | null;
  type: string;
}

interface AccountsSummary {
  totalBalance: number;
  activeAccounts: number;
  creditAccounts: number;
}

interface FinanceCacheState {
  accounts: CachedAccount[];
  categories: CachedCategory[];
  summary: AccountsSummary;
  loading: boolean;
  loadedForUserId: string | null;
  error:string | null;
  unsubscribe: (() => void) | null;
  load: (userId: string) => void;
  reset: () => void;
  clearError: () => void;
}

const ACCOUNT_COLUMNS = [
        "name",
        "balance",
        "type",
        "credit_subtype",
        "currency",
        "is_active",
        "icon_image",
        "institution",
        "credit_limit",
        "statement_closing_day",
        "payment_due_day",
        "apr_annual",
        "apr_monthly",
        "card_last4",
];

const calculateSummary = (accounts: CachedAccount[]): AccountsSummary => {
  let totalBalance = 0;
  let activeAccounts = 0;
  let creditAccounts = 0;

  accounts.forEach((account) => {
    if (account.isActive !== false) activeAccounts += 1;
    if (account.type === "credit") creditAccounts += 1;
    totalBalance += account.balance ?? 0;
  });

  return { totalBalance, activeAccounts, creditAccounts };
};

const formatAccounts = (records: any[]): CachedAccount[] =>
  records
    .map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      iconImage: acc.iconImage ?? null,
      balance: acc.balance ?? 0,
      currency: acc.currency ?? "COP",
      type: acc.type ?? null,
      creditSubtype: acc.creditSubtype ?? null,
      isActive: acc.isActive,
      creditLimit: acc.creditLimit ?? null,
      institution: acc.institution ?? null,
      statementClosingDay: acc.statementClosingDay ?? null,
      paymentDueDay: acc.paymentDueDay ?? null,
      aprAnnual: acc.aprAnnual ?? null,
      aprMonthly: acc.aprMonthly ?? null,
      cardLast4: acc.cardLast4 ?? null,
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
  summary: {
    totalBalance: 0,
    activeAccounts: 0,
    creditAccounts: 0,
  },
  loading: false,
  loadedForUserId: null,
  unsubscribe: null,
  error: null,

  clearError: () => set({ error: null }),

  load: (userId: string) => {
  if (!userId) return;

  const { loadedForUserId, unsubscribe } = get();

  if (
    loadedForUserId === userId &&
    get().accounts.length + get().categories.length > 0
  ) {
    return;
  }

  unsubscribe?.();

  set({
    loading: true,
    loadedForUserId: userId,
    error: null,
  });

  const catsCollection =
    database.collections.get<Category>(Category.table);

  const accsCollection =
    database.collections.get<Account>(Account.table);

  let categoriesLoaded = false;
  let accountsLoaded = false;

  const checkLoading = () => {
    if (categoriesLoaded && accountsLoaded) {
      set({ loading: false });
    }
  };

  const subs = [
    catsCollection
      .query(Q.where("user_id", userId))
      .observe()
      .subscribe({
        next: (records: Category[]) => {
          set({
            categories: formatCategories(records),
          });

          categoriesLoaded = true;
          checkLoading();
        },

        error: (error) => {
          categoriesLoaded = true;

          set({
            error:
              error?.message ??
              "Fallo cargando categorías.",
          });

          checkLoading();
        },
      }),

    accsCollection
      .query(Q.where("user_id", userId))
      .observeWithColumns(ACCOUNT_COLUMNS)
      .subscribe({
        next: (records: Account[]) => {
          const formattedAccounts = formatAccounts(records);

          set({
            accounts: formattedAccounts,
            summary: calculateSummary(formattedAccounts),
          });

          accountsLoaded = true;
          checkLoading();
        },

        error: (error) => {
          accountsLoaded = true;

          set({
            error:
              error?.message ??
              "Fallo cargando cuentas.",
          });

          checkLoading();
        },
      }),
  ];

  set({
    unsubscribe: () => {
      subs.forEach((sub) => sub.unsubscribe());
    },
  });
},

  reset: () => {
    get().unsubscribe?.();
    set({
      accounts: [],
      categories: [],
      summary: {
        totalBalance: 0,
        activeAccounts: 0,
        creditAccounts: 0,
      },
      loading: false,
      loadedForUserId: null,
      unsubscribe: null,
      error:null
    });
    
  },
}));
