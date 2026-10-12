import { Account } from "@/database/models/mlAccount";
import { useStreamState } from "@/hooks/useStream";
import { AccountRepository } from "@/repositories/accounts";
import { of } from "@nozbe/watermelondb/utils/rx";

/** Lista reactiva de cuentas del usuario (reacciona a cambios de balance, etc.). */
export function useAccounts(userId: string): {
  accounts: Account[];
  loading: boolean;
} {
  const { data, loading } = useStreamState<Account[]>(
    () =>
      userId
        ? AccountRepository.buildByUserIdQuery(userId).observeWithColumns(
            AccountRepository.OBSERVABLE_COLUMNS
          )
        : of<Account[]>([]),
    [],
    [userId]
  );

  return { accounts: data, loading };
}
