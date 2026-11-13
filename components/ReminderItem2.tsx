import { Event } from "@/database/models/mlEvent";
import { withObservables } from '@nozbe/watermelondb/react'
import { router } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface ReminderItemProps {
  event: Event;
  id: string
}



const ReminderItem2 = ({ event , id }: ReminderItemProps) => {

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(value);
  // Formateamos la fecha a algo legible
  const dateString = new Date(event.startDate).toLocaleDateString();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
                      onPress={() =>
                        router.push({
                          pathname: "/reminders/[id]",
                          params: { id: id },
                        })
                      }
      className="bg-panel dark:bg-panel-dark p-4 rounded-xl border border-black/10 dark:border-white/10 mb-3 flex-row justify-between items-center shadow-sm"
    >
      <View className="flex-1">
        <Text
          className="font-bold text-ink dark:text-ink-dark text-lg mb-1"
          numberOfLines={1}
        >
          {event.title}
        </Text>
        <Text className="text-muted dark:text-muted-dark text-sm">
          🗓 {dateString} • {event.category}
        </Text>
      </View>

      <View className="items-end ml-2">
        <Text className="font-bold text-expense dark:text-expense-dark text-lg">
          -{formatCurrency(event.amount)}
        </Text>
        {event.recurrence !== "none" && (
          <Text className="text-xs text-muted dark:text-muted-dark capitalize mt-1">
            {event.recurrence}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Conectamos EL REGISTRO INDIVIDUAL a la base de datos
const enhance = withObservables(["event"], ({ event }) => ({
  event: event.observe(),
}));


export default enhance(ReminderItem2);
