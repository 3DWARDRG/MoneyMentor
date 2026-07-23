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
      className="bg-white p-4 rounded-xl border border-gray-200 mb-3 flex-row justify-between items-center shadow-sm"
    >
      <View className="flex-1">
        <Text
          className="font-bold text-gray-800 text-lg mb-1"
          numberOfLines={1}
        >
          {event.title}
        </Text>
        <Text className="text-gray-500 text-sm">
          🗓 {dateString} • {event.category}
        </Text>
      </View>

      <View className="items-end ml-2">
        <Text className="font-bold text-red-500 text-lg">
          -{formatCurrency(event.amount)}
        </Text>
        {event.recurrence !== "none" && (
          <Text className="text-xs text-gray-400 capitalize mt-1">
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
