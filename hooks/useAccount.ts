import { Account } from "@/database/models/mlAccount";
import { useStreamState } from "@/hooks/useStream";
import { AccountRepository } from "@/repositories/accounts";
import { of } from "@nozbe/watermelondb/utils/rx";

/** Una cuenta por id (reactivo a todos sus campos). */
export function useAccount(id: string | undefined): {
  account: Account | null;
  loading: boolean;
} {
  const { data, loading } = useStreamState<Account | null>(
    () =>
      id ? AccountRepository.observeById(id) : of<Account | null>(null),
    null,
    [id]
  );

  return { account: data, loading };
}
