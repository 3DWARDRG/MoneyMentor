// app/(tabs)/reminders/[id].tsx
import { database } from "@/database";
import { Event } from "@/database/models/mlEvent";
import { deleteExpenseEvent } from "@/services/eventsHelper";

import { withObservables } from '@nozbe/watermelondb/react'
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
interface EventDetailProps {
  event: Event;
}

const EventDetailScreen = ({ event }: EventDetailProps) => {
  const navigation = useNavigation();

  const handleEdit = useCallback(() => {
    router.push({
      pathname: "/reminders/new",
      params: { id: event.id },
    });
  }, [event]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text className="text-accent dark:text-accent-dark font-medium">Cerrar</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleEdit} hitSlop={8}>
          <Text className="text-accent dark:text-accent-dark font-medium">Editar</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleEdit]);

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
    <SafeAreaView className="flex-1 bg-deep dark:bg-deep-dark"  edges={["bottom", "left", "right"]}>
    <View  className="flex-1">
      {/* Info Principal */}
      <View className="items-center mb-10">
        <Text className="text-muted dark:text-muted-dark text-lg">{event.category}</Text>
        <Text className="text-4xl font-bold mt-2 mb-2 text-ink dark:text-ink-dark">
          ${event.amount.toFixed(2)}
        </Text>
        <Text className="text-2xl text-ink dark:text-ink-dark">{event.title}</Text>
        <Text className="text-muted dark:text-muted-dark mt-4">
          🗓 {new Date(event.startDate).toLocaleDateString()}
        </Text>
      </View>

      {/* Botones de Acción Rápida */}
      <View className="mt-auto ">
        <TouchableOpacity
          onPress={handleMarkAsPaid}
          className="bg-income dark:bg-income-dark p-4 rounded-xl items-center mb-4"
        >
          <Text className="text-[#07101e] font-bold text-lg">
            ✅ Marcar como Pagado
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          className="bg-expense/10 dark:bg-expense-dark/10 p-4 rounded-xl items-center border border-expense/20 dark:border-expense-dark/20"
        >
          <Text className="text-expense dark:text-expense-dark font-bold text-lg">
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
