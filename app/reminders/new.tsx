import { Dropdown } from "@/components/Dropdown";
import KeyboardAvoidingScrollView from "@/components/KeyboardAvoidingScrollView";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";
import { useConfirmLeave } from "@/hooks/useConfirmLeave";
import { useDirtyState } from "@/hooks/useDirtyState";
import {
  createEventWithNotification,
  getEventById,
  updateEvent,
} from "@/services/eventService";
import { scheduleEventNotification } from "@/services/pushNotifications";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import {
  EventRecurrenceT,
  eventRecurrenceOptionsES,
} from "@/utils/translateDataDropdowns";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateEventScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { id } = useLocalSearchParams<{ id: string }>(); // Si hay ID, es modo Edición
  const isEditing = !!id;

  const [eventRecurrence, setEventRecurrence] =
    useState<EventRecurrenceT>("none");

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const formatCOP = (text: string) => {
    const numeric = text.replace(/\D/g, "");
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const cleanAmount = (d: string) => parseFloat(d.replace(/\./g, ""));

  const getFinalDateObject = (dateString: any) => {
    // 1. Rompemos el string "YYYY-MM-DD" en sus tres partes
    const [year, month, day] = dateString.split("-");
    // Al no pasar horas/minutos, JavaScript lo crea a las 00:00:00 hora local
    return new Date(year, month - 1, day);
  };

  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const { getUserPermissions } = useSettingsStore();
  const notificationsEnabled = getUserPermissions(
    userId ?? "",
  ).pushNotifications;
  const [isLoading, setIsLoading] = useState(isEditing); // Cargando solo si es edición
  // 1. Estados del formulario
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  // El string que te da el calendario (ej. "2026-07-20")
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const todayString = formatLocalDate(new Date());
  const navigation = useNavigation();

  const { isDirty, resetBaseline } = useDirtyState([
    title,
    amount,
    selectedDateStr,
    eventRecurrence,
  ]);

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setSelectedDateStr("");
    setEventRecurrence("none");
    resetBaseline();
  };

  useConfirmLeave({
    enabled: isDirty,
    message: isEditing
      ? "Si sales ahora, los cambios del recordatorio no se guardarán."
      : "Si sales ahora, el recordatorio no se creará.",
    onDiscard: resetForm,
  });

  const handleSave = async () => {
    // --- BARRERA 1: Datos completos ---
    if (!title || !amount) {
      Alert.alert("Datos incompletos", "Por favor llena el título y el monto.");
      return;
    }

    if (!selectedDateStr) {
      Alert.alert(
        "Falta la fecha",
        "Por favor selecciona un día en el calendario.",
      );
      return;
    }

    // --- BARRERA 2: Total Verify (Guardián de Permisos) ---
    if (!notificationsEnabled) {
      Alert.alert(
        "Acción Bloqueada",
        "Las notificaciones están desactivadas. Necesitas habilitarlas en tu Perfil para crear un recordatorio.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Ir al Perfil", onPress: () => router.push("/profile") },
        ],
      );
      return; // 🛑 Cortamos la ejecución aquí. No entra basura a la DB.
    }

    const finalTargetDate = getFinalDateObject(selectedDateStr);

    const targetTimestamp = finalTargetDate.getTime();

    try {
      if (isEditing && id) {
        // Lógica de EDICIÓN (Llamamos al helper que hicimos antes)
        await updateEvent({
          eventId: id,
          title,
          amount: cleanAmount(amount),
          targetTimestamp, // Calculado como siempre
          category: "General", // O tu estado de categoría
          recurrence: eventRecurrence,
        });
        Alert.alert("Actualizado", "El recordatorio fue modificado.", [
          { text: "OK", onPress: () => router.push("/reminders") },
        ]);
      } else {
        // Lógica de CREACIÓN original
        // --- FASE 3: Ejecución de Expo ---
        const expoNotificationId = await scheduleEventNotification(
          title,
          parseFloat(amount),
          targetTimestamp,
          "Gasto",
        );

        if (!expoNotificationId) throw new Error("Fallo al programar en Expo");

        // 4. Delegamos a nuestro Helper (Base de Datos)
        // Asumimos que obtienes el userId de tu store de Auth (ej. authStore.userId)
        await createEventWithNotification({
          userId: userId ?? "", // <- Reemplazar por tu usuario real
          title,
          amount: cleanAmount(amount),
          targetTimestamp,
          category: "General",
          recurrence: eventRecurrence,
          expoNotificationId,
        });

        Alert.alert(
          "¡Gasto Programado! 💸",
          `Te recordaremos el ${selectedDateStr} a las 9:00 AM.`,
          [{ text: "Genial", onPress: () => router.push("/reminders") }],
        );
      }

      resetForm();
    } catch (error) {
      console.error("Error al guardar:", error);
      Alert.alert("Error", "Hubo un problema al guardar el recordatorio.");
    }

    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4b9aff" />
        </View>
      );
    }
  };

  useEffect(() => {
    if (isEditing) {
      navigation.setOptions({
        title: id ? "Editar recordatorio" : "Nuevo recordatorio",
      });
      const loadEvent = async () => {
        try {
          const record = await getEventById(id);
          if (!record) throw new Error("Recordatorio no encontrado");
          setTitle(record.title);
          setAmount(String(record.amount));
          setEventRecurrence(record.recurrence ?? "none");
          // Convertimos el timestamp guardado al string que espera tu calendario
          const dateObj = new Date(record.startDate);
          // Ojo: Asegúrate de formatearlo como YYYY-MM-DD según tu utilidad
          setSelectedDateStr(dateObj.toISOString().split("T")[0]);
          resetBaseline();

          // ... poblar demás campos ...
        } catch (error) {
          Alert.alert("Error", "No se pudo cargar el recordatorio");
        }
      };
      loadEvent();
    } else {
      setTitle("");
      setAmount("");
      setEventRecurrence("none");

      setSelectedDateStr("");
      resetBaseline();
    }
  }, [id, isEditing, navigation, resetBaseline]);

  return (
    <SafeAreaView
      className="flex-1 bg-deep dark:bg-deep-dark"
      edges={["bottom", "left", "right"]}
    >
      <ScreenBackdrop />
      <KeyboardAvoidingScrollView className="flex-1 p-4">
        {/* Inputs Básicos */}
        <View className="mb-4">
          <Text className="text-sm text-muted dark:text-muted-dark mb-1">
            Título
          </Text>
          <TextInput
            className="bg-deepSoft dark:bg-deepSoft-dark border border-black/10 dark:border-white/10 rounded-lg p-3 text-ink dark:text-ink-dark"
            placeholder="Ej. Tarjeta de Crédito"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm text-muted dark:text-muted-dark mb-1">
            Monto ($)
          </Text>
          <TextInput
            className="bg-deepSoft dark:bg-deepSoft-dark border border-black/10 dark:border-white/10 rounded-lg p-3 text-ink dark:text-ink-dark"
            placeholder="50.000"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={amount}
            onChangeText={(amount) => setAmount(formatCOP(amount))}
          />
        </View>

        <View className=" z-50 flex justify-items-center">
          <Text className="text-sm text-muted dark:text-muted-dark">
            Frecuencia:
          </Text>

          <Dropdown
            options={eventRecurrenceOptionsES}
            value={eventRecurrence}
            onSelect={setEventRecurrence}
            placeholder="Selecciona una frecuencia"
          />
        </View>
        <View className="my-4">
          <Calendar
            onDayPress={(day: any) => setSelectedDateStr(day.dateString)}
            minDate={todayString}
            markedDates={{
              [selectedDateStr]: { selected: true, selectedColor: "#4b9aff" },
            }}
            current={selectedDateStr}
            theme={{
              calendarBackground: isDark ? "#0a1220" : "#ffffff",
              textSectionTitleColor: isDark ? "#97a4bb" : "#7a7266",
              selectedDayBackgroundColor: "#4b9aff",
              selectedDayTextColor: "#ffffff",
              todayTextColor: "#4b9aff",
              dayTextColor: isDark ? "#f6f8ff" : "#1c1917",
              monthTextColor: isDark ? "#f6f8ff" : "#1c1917",
              arrowColor: "#4b9aff",
              textDisabledColor: isDark ? "#3a4a63" : "#d0cbbf",
            }}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e7e2d8",
              backgroundColor: isDark ? "#0a1220" : "#ffffff",
              marginBottom: 10,
            }}
          />
        </View>

        {/* --- EL BANNER DINÁMICO (Feedback Visual) --- */}
        <View className="my-6">
          {notificationsEnabled ? (
            // Estado OK: Banner informativo azul
            <View className="bg-accent/10 dark:bg-accent-dark/10 border border-accent/20 dark:border-accent-dark/20 p-4 rounded-lg flex-row items-center">
              <Text className="text-accent dark:text-accent-dark flex-1 leading-5">
                🔔 <Text className="font-bold">Notificaciones activas.</Text> Te
                recordaremos este gasto el {selectedDateStr} a las 9:00 AM.
              </Text>
            </View>
          ) : (
            // Estado CRÍTICO: Banner rojo clickeable
            <TouchableOpacity
              activeOpacity={0.7}
              className="bg-expense/10 dark:bg-expense-dark/10 border border-expense/20 dark:border-expense-dark/20 p-4 rounded-lg flex-row items-center"
              onPress={() => router.push("/profile")} // Lleva al usuario directo a la solución
            >
              <Text className="text-expense dark:text-expense-dark flex-1 leading-5">
                ⚠️ <Text className="font-bold">Notificaciones pausadas.</Text>{" "}
                No podremos recordarte.{" "}
                <Text className="underline font-bold">
                  Toca aquí para habilitarlas en tu Perfil.
                </Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity
          className="bg-income dark:bg-income-dark p-4 rounded-xl items-center"
          onPress={handleSave}
        >
          <Text className="text-[#07101e] font-bold text-lg">
            {" "}
            {isEditing ? "Actualizar Recordatorio" : "Guardar Recordatorio"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingScrollView>
    </SafeAreaView>
  );
}
