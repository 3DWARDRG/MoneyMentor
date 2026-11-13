import { of } from "@nozbe/watermelondb/utils/rx";
import { Event } from "@/database/models/mlEvent";
import { useStreamState } from "@/hooks/useStream";
import { EventRepository } from "@/repositories/events";

/** Recordatorios pendientes del usuario (reactivo). */
export function useEvents(userId: string): {
  events: Event[];
  loading: boolean;
} {
  const { data, loading } = useStreamState<Event[]>(
    () =>
      userId
        ? EventRepository.buildPendingByUserIdQuery(userId).observeWithColumns(
            EventRepository.OBSERVABLE_COLUMNS
          )
        : of<Event[]>([]),
    [],
    [userId]
  );

  return { events: data, loading };
}
