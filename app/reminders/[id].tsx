// app/(tabs)/reminders/[id].tsx
import { database } from "@/database";
import { Event } from "@/database/models/mlEvent";
import { deleteExpenseEvent } from "@/services/eventsHelper";

import { Ionicons } from "@expo/vector-icons";
import { withObservables } from '@nozbe/watermelondb/react'
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
interface EventDetailProps {
  event: Event;
}

const EventDetailScreen = ({ event }: EventDetailProps) => {
  // Función para confirmar y eliminar
  const handleDelete = () => {
    Alert.alert(
      "Eliminar Recordatorio",
      "¿Estás seguro? Esta acción también cancelará la alarma programada.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpenseEvent(event.id);
              router.push("/reminders");
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar.");
            }
          },
        },
      ],
    );
  };

  // Función rápida para marcar como pagado (Actualiza la DB directamente)
  const handleMarkAsPaid = async () => {
    try {
      await database.write(async () => {
        await event.update((e) => {
          e.status = "paid";
        });
      });
      // Si quieres, aquí también puedes llamar a Expo para cancelar la alarma
      // ya que el gasto ya fue pagado.
      Alert.alert("¡Pagado!", "Has marcado este gasto como completado.", [
        { text: "Genial", onPress: () =>  router.push("/reminders") },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-300"  edges={["bottom", "left", "right"]}>
    <View  className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-8">
        <TouchableOpacity onPress={() =>  router.push("/reminders")}>
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text className="text-black">
            Retroceder
          </Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-black">Detalles</Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/reminders/new",
              params: { id: event.id },
            })
          }
        >
            <Text className="text-black">Editar Recordatorio</Text>
          <Ionicons name="pencil" size={24} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {/* Info Principal */}
      <View className="items-center mb-10">
        <Text className="text-black text-lg">{event.category}</Text>
        <Text className="text-4xl font-bold mt-2 mb-2 text-black">
          ${event.amount.toFixed(2)}
        </Text>
        <Text className="text-2xl text-black">{event.title}</Text>
        <Text className="text-black mt-4">
          🗓 {new Date(event.startDate).toLocaleDateString()}
        </Text>
      </View>

      {/* Botones de Acción Rápida */}
      <View className="mt-auto ">
        <TouchableOpacity
          onPress={handleMarkAsPaid}
          className="bg-green-500 p-4 rounded-xl items-center mb-4"
        >
          <Text className="text-white font-bold text-lg">
            ✅ Marcar como Pagado
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          className="bg-red-50 p-4 rounded-xl items-center border border-red-200"
        >
          <Text className="text-red-600 font-bold text-lg">
            🗑 Eliminar Recordatorio
          </Text>
        </TouchableOpacity>

      </View>
    </View>
    </SafeAreaView>
  );
};

// Conectamos a WatermelonDB para que sea reactivo a los cambios (ej. si volvemos de la pantalla de edición)
const enhance = withObservables(["id"], ({ id }: { id: string }) => ({
  event: database.collections.get<Event>("events").findAndObserve(id),
}));

const EnhancedDetailScreen = enhance(EventDetailScreen);

// Wrapper para capturar el ID de la URL y evitar errores
export default function DetailScreenWrapper() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <EnhancedDetailScreen id={id} />;
}
