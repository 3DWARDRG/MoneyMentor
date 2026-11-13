// components/DateRangePicker.tsx
//
// Calendario en un Modal (react-native-calendars) para elegir un rango de
// fechas: el primer toque fija el inicio y el segundo el fin (se invierten si
// el fin es anterior al inicio). Confirma con `onConfirm(start, end)`
// (timestamps en ms).
//
// - No permite fechas futuras: `maxDate` es HOY (dinámico), así que el usuario
//   no puede pedir gastos que aún no existen.
// - Navegación rápida: botones de mes y de año (◀ / ▶ y año) para no tener que
//   deslizar mes a mes hasta llegar a un año lejano.

import { Calendar } from "react-native-calendars";
import { useColorScheme } from "nativewind";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

interface Props {
  visible: boolean;
  initialStart: number;
  initialEnd: number;
  onConfirm: (start: number, end: number) => void;
  onClose: () => void;
}

const toDateString = (ts: number): string => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const todayString = (): string => toDateString(Date.now());

const startOfDay = (dateStr: string): number => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
};

const endOfDay = (dateStr: string): number => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
};

export default function DateRangePicker({
  visible,
  initialStart,
  initialEnd,
  onConfirm,
  onClose,
}: Props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [startStr, setStartStr] = useState<string | null>(null);
  const [endStr, setEndStr] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(() => todayString());

  useEffect(() => {
    if (visible) {
      const today = Date.now();
      setStartStr(toDateString(Math.min(initialStart, today)));
      setEndStr(toDateString(Math.min(initialEnd, today)));
      setCurrentDate(toDateString(Math.min(initialStart, today)));
    }
  }, [visible, initialStart, initialEnd]);

  const handleDayPress = (day: any) => {
    const ds: string = day.dateString;
    if (ds > todayString()) return;
    if (!startStr || (startStr && endStr)) {
      setStartStr(ds);
      setEndStr(null);
    } else if (ds < startStr) {
      setEndStr(startStr);
      setStartStr(ds);
    } else {
      setEndStr(ds);
    }
  };

  const shiftMonths = (delta: number) => {
    const d = new Date(`${currentDate}T12:00:00`);
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    setCurrentDate(toDateString(d.getTime()));
  };

  const goToday = () => setCurrentDate(todayString());

  const currentLabel = new Date(`${currentDate}T12:00:00`)
    .toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    .replace(" de ", " ");

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    if (!startStr) return marks;
    const end = endStr ?? startStr;
    const cur = new Date(`${startStr}T12:00:00`);
    const last = new Date(`${end}T12:00:00`);
    while (cur.getTime() <= last.getTime()) {
      const key = toDateString(cur.getTime());
      if (key === startStr && key === end) {
        marks[key] = {
          startingDay: true,
          endingDay: true,
          color: "#4b9aff",
          textColor: "#ffffff",
        };
      } else if (key === startStr) {
        marks[key] = { startingDay: true, color: "#4b9aff", textColor: "#ffffff" };
      } else if (key === end) {
        marks[key] = { endingDay: true, color: "#4b9aff", textColor: "#ffffff" };
      } else {
        marks[key] = { color: "rgba(75,154,255,0.35)" };
      }
      cur.setDate(cur.getDate() + 1);
    }
    return marks;
  }, [startStr, endStr]);

  const confirm = () => {
    if (!startStr) return;
    const end = endStr ?? startStr;
    onConfirm(startOfDay(startStr), endOfDay(end));
  };

  const rangeLabel = startStr
    ? endStr && endStr !== startStr
      ? `${startStr} → ${endStr}`
      : startStr
    : "Selecciona una fecha";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="w-full max-w-md rounded-2xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10 p-4">
          <Text className="text-lg font-bold text-center text-ink dark:text-ink-dark mb-1">
            Selecciona el período
          </Text>
          <Text className="text-center text-muted dark:text-muted-dark mb-3">
            {rangeLabel}
          </Text>

          <View className="flex-row items-center justify-between mb-2">
            <Pressable
              onPress={() => shiftMonths(-12)}
              className="px-2 py-1 rounded-lg bg-deepSoft dark:bg-deepSoft-dark"
            >
              <Text className="text-xs text-muted dark:text-muted-dark">
                ⏪ Año
              </Text>
            </Pressable>
            <Pressable
              onPress={() => shiftMonths(-1)}
              className="px-3 py-1 rounded-lg bg-deepSoft dark:bg-deepSoft-dark"
            >
              <Text className="text-sm text-ink dark:text-ink-dark">◀</Text>
            </Pressable>
            <Text className="text-base font-semibold text-ink dark:text-ink-dark capitalize">
              {currentLabel}
            </Text>
            <Pressable
              onPress={() => shiftMonths(1)}
              className="px-3 py-1 rounded-lg bg-deepSoft dark:bg-deepSoft-dark"
            >
              <Text className="text-sm text-ink dark:text-ink-dark">▶</Text>
            </Pressable>
            <Pressable
              onPress={() => shiftMonths(12)}
              className="px-2 py-1 rounded-lg bg-deepSoft dark:bg-deepSoft-dark"
            >
              <Text className="text-xs text-muted dark:text-muted-dark">
                Año ⏭
              </Text>
            </Pressable>
          </View>

          <View style={{ borderRadius: 12, overflow: "hidden" }}>
            <Calendar
              key={currentDate}
              current={currentDate}
              hideArrows
              maxDate={todayString()}
              markingType="period"
              onDayPress={handleDayPress}
              markedDates={markedDates}
              theme={{
                calendarBackground: isDark ? "#0a1220" : "#ffffff",
                textSectionTitleColor: isDark ? "#97a4bb" : "#7a7266",
                selectedDayBackgroundColor: "#4b9aff",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#4b9aff",
                dayTextColor: isDark ? "#f6f8ff" : "#1c1917",
                monthTextColor: isDark ? "#f6f8ff" : "#1c1917",
                textDisabledColor: isDark ? "#3a4a63" : "#d0cbbf",
              }}
            />
          </View>

          <View className="flex-row items-center justify-between mt-4">
            <Pressable onPress={goToday} className="px-3 py-2 rounded-xl">
              <Text className="text-accent dark:text-accent-dark text-sm font-medium">
                Hoy
              </Text>
            </Pressable>
            <View className="flex-row">
              <Pressable
                onPress={onClose}
                className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 mr-2"
              >
                <Text className="text-muted dark:text-muted-dark">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={confirm}
                className="px-4 py-2 rounded-xl bg-accent dark:bg-accent-dark"
              >
                <Text className="text-white font-semibold">Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
