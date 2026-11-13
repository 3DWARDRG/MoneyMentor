import { useMemo } from "react";
import { useStream } from "@/hooks/useStream";
import { UserRepository } from "@/repositories/users";

export interface UserListItem {
  id: string;
  names: string;
  lastName: string;
  email: string;
}

/** Lista reactiva de usuarios locales, moldeada para la UI. */
export function useUsers(): UserListItem[] {
  const users = useStream(
    () =>
      UserRepository.buildAllQuery().observeWithColumns(
        UserRepository.OBSERVABLE_COLUMNS
      ),
    [],
    []
  );

  return useMemo(
    () =>
      users.map((user) => ({
        id: user.id,
        names: user.names,
        lastName: user.lastName ?? "",
        email: user.email ?? "",
      })),
    [users]
  );
}
