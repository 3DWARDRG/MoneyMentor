// hooks/useAccounts.ts
import { database } from "@/database";
import { Account } from "@/database/models/mlAccount";
import { Q } from "@nozbe/watermelondb";
import { useCallback, useEffect, useState } from "react";

interface AccountsSummary {
  totalBalance: number;
  activeAccounts: number;
  creditAccounts: number;
}

export const useAccounts = (userId: string) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AccountsSummary>({
    totalBalance: 0,
    activeAccounts: 0,
    creditAccounts: 0,
  });

  const resetState = useCallback(() => {
    setAccounts([]);
    setSummary({
      totalBalance: 0,
      activeAccounts: 0,
      creditAccounts: 0,
    });
    setLoading(false);
  }, []);

  const buildSummary = useCallback((all: Account[]) => {
    let totalBalance = 0;
    let activeAccounts = 0;
    let creditAccounts = 0;

    all.forEach((account) => {
      if (account.isActive !== false) activeAccounts += 1;
      if (account.type === "credit") creditAccounts += 1;
      totalBalance += account.balance ?? 0;
    });

    return {
      totalBalance,
      activeAccounts,
      creditAccounts,
    };
  }, []);

  const refreshAccounts = useCallback(async () => {
    if (!userId) {
      resetState();
      return;
    }

    try {
      setLoading(true);

      const all = await database
        .get<Account>("accounts")
        .query(Q.where("user_id", userId))
        .fetch();

      const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
      setAccounts(sorted);
      setSummary(buildSummary(all));
    } catch (err) {
      console.error("❌ useAccounts refresh error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, resetState, buildSummary]);

  useEffect(() => {
    if (!userId) {
      resetState();
      return;
    }

    setLoading(true);

    const subscription = database
      .get<Account>("accounts")
      .query(Q.where("user_id", userId))
      .observeWithColumns([
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
      ])
      .subscribe({
        next: (all) => {
          const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
          setAccounts(sorted);
          setSummary(buildSummary(all));
          setLoading(false);
        },
        error: (err) => {
          console.error("❌ useAccounts observe error:", err);
          setLoading(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [userId, resetState, buildSummary]);

  return { accounts, loading, summary, refreshAccounts };
};
