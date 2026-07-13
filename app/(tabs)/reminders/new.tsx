import { scheduleEventNotification } from "@/utils/notifications";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EventRecurrence } from '@/database/models/mlEvent';

export default function CreateEventScreen() {
  // 1. Estados del formulario
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [recurrence, setRecurrence] = useState<EventRecurrence>("monthly"); // Por defecto mensual
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 86400000));

  const [wantsCalendar, setWantsCalendar] = useState(false);
  const [wantsNotification, setWantsNotification] = useState(true);

  const handleSave = async () => {
    if (!title || !amount) {
      Alert.alert("Error", "Por favor llena el título y el monto.");
      return;
    }

    try {
      let expoNotificationId = null;

      if (wantsNotification) {
        // La función ahora es más limpia, solo para pagos
        expoNotificationId = await scheduleEventNotification(
          title,
          parseFloat(amount),
          targetDate.getTime(),
          "Gasto", // O la categoría de gasto que elija
        );
      }

      // AQUÍ IRÁ LA ESCRITURA EN WATERMELONDB

      if (wantsNotification && expoNotificationId) {
        Alert.alert(
          "¡Gasto Programado! 💸",
          `Guardado exitosamente. Te recordaremos el ${targetDate.toLocaleDateString()} a las 9:00 AM.`,
          [{ text: "Genial", style: "default" }],
        );
      } else {
        Alert.alert("¡Guardado!", "Tu registro ha sido creado.");
      }
    } catch (error) {
      Alert.alert("Error", "Hubo un problema al guardar.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f5f5f5]">
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
            onChangeText={setAmount}
          />
        </View>

        {/* Sección de Preferencias (Switches) */}
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          Preferencias
        </Text>

        <View className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-700 font-medium">
              Sincronizar con Calendario
            </Text>
            <Switch value={wantsCalendar} onValueChange={setWantsCalendar} />
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-gray-700 font-medium">
              Recordarme a las 9:00 AM
            </Text>
            <Switch
              value={wantsNotification}
              onValueChange={setWantsNotification}
              trackColor={{ true: "#16a34a", false: "#d1d5db" }}
            />
          </View>
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity
          className="bg-green-600 p-4 rounded-xl items-center"
          onPress={handleSave}
        >
          <Text className="text-white font-bold text-lg">Guardar Registro</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
