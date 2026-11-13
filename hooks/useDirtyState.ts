import { useCallback, useRef } from "react";

export function useDirtyState(values: unknown[]) {
  const baselineRef = useRef<string | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const serialize = useCallback(() => JSON.stringify(valuesRef.current), []);

  const resetBaseline = useCallback(() => {
    baselineRef.current = serialize();
  }, [serialize]);

  return {
    isDirty:
      baselineRef.current !== null && serialize() !== baselineRef.current,
    resetBaseline,
  };
}
