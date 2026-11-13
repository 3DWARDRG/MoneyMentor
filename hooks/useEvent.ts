import { of } from "@nozbe/watermelondb/utils/rx";
import { Event } from "@/database/models/mlEvent";
import { useStreamState } from "@/hooks/useStream";
import { EventRepository } from "@/repositories/events";

/** Un evento por id (reactivo a todos sus campos). */
export function useEvent(id: string | undefined): {
  event: Event | null;
  loading: boolean;
} {
  const { data, loading } = useStreamState<Event | null>(
    () => (id ? EventRepository.observeById(id) : of<Event | null>(null)),
    null,
    [id]
  );

  return { event: data, loading };
}
