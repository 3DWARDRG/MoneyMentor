import { User } from "@/database/models/mlUser";
import { useStream } from "@/hooks/useStream";
import { UserRepository } from "@/repositories/users";
import { of } from "@nozbe/watermelondb/utils/rx";

/** Un usuario por id (reactivo a todos sus campos). */
export function useUser(userId: string): {
  user: User | null;
  loading: boolean;
} {
  const user = useStream<User | null>(
    () => (userId ? UserRepository.observeById(userId) : of<User | null>(null)),
    null,
    [userId]
  );

  return { user, loading: !!userId && user === null };
}
