import { database } from "@/database";
import { Event } from "@/database/models/mlEvent";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";
import { withObservables } from "@nozbe/watermelondb/react";
import React from "react";
import { FlatList, Text, View } from "react-native";
import ReminderItem2 from "./ReminderItem2";

// 1. Tu componente visual (queda exactamente igual)
interface RemindersListProps {
  events: Event[];
}

const RemindersList = ({ events }: RemindersListProps) => {
  return (
    <View className="flex-1 w-full bg-black p-6">
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReminderItem2 event={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="py-10 items-center">
            <Text className="text-gray-400 text-lg text-center">
              No tienes recordatorios pendientes. 🎉
            </Text>
          </View>
        }
      />
    </View>
  );
};

// 2. EL HOC: Nota que ahora recibe "userId" en el arreglo de dependencias
const enhance = withObservables(
  ["userId"],
  ({ userId }: { userId: string }) => ({
    events: database.collections
      .get<Event>("events")
      .query(
        Q.where("user_id", userId), // Ahora userId siempre tendrá un string real
        Q.where("status", "pending"),
        Q.sortBy("start_date", Q.asc),
      )
      .observe(),
  }),
);

// Generamos el componente reactivo pero NO lo exportamos por defecto todavía
const EnhancedRemindersList = enhance(RemindersList);

// 3. EL WRAPPER: El puente correcto entre React/Zustand y WatermelonDB
export default function RemindersListWrapper() {
  // AQUÍ SÍ es legal llamar a tu hook
  const { userId } = useAuthStore();

  // Defensa en profundidad: Si por alguna razón no hay usuario, no intentamos hacer la query
  if (!userId) {
    return null; // O puedes retornar un <ActivityIndicator />
  }

  // Le pasamos el userId como propiedad (prop) para que withObservables lo lea
  return <EnhancedRemindersList userId={userId} />;
}
