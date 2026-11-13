import { DependencyList, useEffect, useState } from "react";
import { Observable } from "@nozbe/watermelondb/utils/rx";

/** Suscribe a un Observable y expone el último valor + si aún está cargando. */
export function useStreamState<T>(
  factory: () => Observable<T>,
  initialValue: T,
  deps: DependencyList,
): { data: T; loading: boolean } {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const subscription = factory().subscribe({
      next: (value) => {
        setData(value);
        setLoading(false);
      },
      error: (err) => {
        console.error("Stream error:", err);
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}

/** Suscribe a un Observable y devuelve solo su último valor. */
export function useStream<T>(
  factory: () => Observable<T>,
  initialValue: T,
  deps: DependencyList,
): T {
  return useStreamState(factory, initialValue, deps).data;
}
