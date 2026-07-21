import { Dropdown } from "@/components/Dropdown";
import { EventRecurrence } from "@/database/models/mlEvent";
import { createExpenseEventWithNotification } from "@/services/eventsHelper";
import { scheduleEventNotification } from "@/services/notifications";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import {
  EventRecurrenceT , eventRecurrenceOptionsES
} from "@/utils/translateDataDropdowns";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";


export default function CreateEventScreen() {

  const [eventRecurrence, setEventRecurrence] = useState<EventRecurrenceT>("none");

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

  const cleanAmount =(d : string)=> parseFloat(d.replace(/\./g, '')); 

  const getFinalDateObject = (dateString: any) => {
    // 1. Rompemos el string "YYYY-MM-DD" en sus tres partes
    const [year, month, day] = dateString.split("-");
    // Al no pasar horas/minutos, JavaScript lo crea a las 00:00:00 hora local
    return new Date(year, month - 1, day);
  };

  const router = useRouter();
  const { userId } = useAuthStore();
  const { getUserPermissions } = useSettingsStore();
  const notificationsEnabled = getUserPermissions(
    userId ?? "",
  ).pushNotifications;

  // 1. Estados del formulario
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  // El string que te da el calendario (ej. "2026-07-20")
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const todayString = formatLocalDate(new Date());
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
      await createExpenseEventWithNotification({
        userId: userId ?? "", // <- Reemplazar por tu usuario real
        title,
        amount: cleanAmount(amount),
        targetTimestamp,
        category: "General",
        recurrence : eventRecurrence,
        expoNotificationId,
      });

      Alert.alert(
        "¡Gasto Programado! 💸",
        `Te recordaremos el ${selectedDateStr} a las 9:00 AM.`,
        [{ text: "Genial", onPress: () => router.back() }],
      );
    } catch (error) {
      console.error("Error al guardar:", error);
      Alert.alert("Error", "Hubo un problema al guardar el recordatorio.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-400">
      <ScrollView className="flex-1 bg-white p-4">
        <Text className="text-2xl font-bold text-gray-800 mb-6">
          Nuevo Registro
        </Text>

        {/* Inputs Básicos */}
        <View className="mb-4">
          <Text className="text-sm text-gray-600 mb-1">Título</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800"
            placeholder="Ej. Tarjeta de Crédito"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm text-gray-600 mb-1">Monto ($)</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800"
            placeholder="500.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={(amount) => setAmount(formatCOP(amount))}
          />
        </View>

                  <View className="d-flex flex-col  z-50">
                              <Text className="text-sm text-gray-600">Frecuencia:</Text>
                    <View className="flex-1   m-2">
                      <Dropdown
                        options={eventRecurrenceOptionsES}
                        value={eventRecurrence}
                        onSelect={setEventRecurrence}
                        placeholder="Selecciona una frecuencia"
                      />
                    </View>
                  </View>

        <Calendar
          onDayPress={(day: any) => setSelectedDateStr(day.dateString)}
          minDate={todayString}
          markedDates={{
            [selectedDateStr]: { selected: true, selectedColor: "#2563eb" },
          }}
          current={selectedDateStr}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            backgroundColor: "white",
            marginBottom: 10,
            marginTop: 10
          }}
          theme={{
            todayTextColor: "#2563eb",
            arrowColor: "#2563eb",
            selectedDayBackgroundColor: "#2563eb",
          }}
        />

        {/* --- EL BANNER DINÁMICO (Feedback Visual) --- */}
        <View className="mt-4 mb-6">
          {notificationsEnabled ? (
            // Estado OK: Banner informativo azul
            <View className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex-row items-center">
              <Text className="text-blue-800 flex-1 leading-5">
                🔔 <Text className="font-bold">Notificaciones activas.</Text> Te
                recordaremos este gasto el {selectedDateStr} a las 9:00 AM.
              </Text>
            </View>
          ) : (
            // Estado CRÍTICO: Banner rojo clickeable
            <TouchableOpacity
              activeOpacity={0.7}
              className="bg-red-50 border border-red-200 p-4 rounded-lg flex-row items-center"
              onPress={() => router.push("/profile")} // Lleva al usuario directo a la solución
            >
              <Text className="text-red-800 flex-1 leading-5">
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
          className="bg-green-600 p-4 rounded-xl items-center"
          onPress={handleSave}
        >
          <Text className="text-black font-bold text-lg">Guardar Registro</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
