import { useMemo } from "react";
import { Account } from "@/database/models/mlAccount";

export interface AccountSummary {
  totalBalance: number;
  activeAccounts: number;
  creditAccounts: number;
}

/** Agregado derivado de la lista de cuentas (sin volver a consultar la DB). */
export function useAccountSummary(accounts: Account[]): AccountSummary {
  return useMemo(() => {
    let totalBalance = 0;
    let activeAccounts = 0;
    let creditAccounts = 0;

    for (const account of accounts) {
      if (account.isActive !== false) activeAccounts += 1;
      if (account.type === "credit") creditAccounts += 1;
      totalBalance += account.balance ?? 0;
    }

    return { totalBalance, activeAccounts, creditAccounts };
  }, [accounts]);
}
