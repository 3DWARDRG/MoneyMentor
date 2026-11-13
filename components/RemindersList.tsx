import { useEvents } from "@/hooks/useEvents";
import { useAuthStore } from "@/store/useAuthStore";
import React from "react";
import { FlatList, Text, View } from "react-native";
import ReminderItem2 from "./ReminderItem2";

export default function RemindersList() {
  const userId = useAuthStore((s) => s.userId);
  const { events } = useEvents(userId ?? "");

  return (
    <View className="flex-1 w-full p-6">
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReminderItem2 event={item} id={item.id} />}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 20,
        }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center ">
            <Text className="text-ink dark:text-ink-dark text-xl text-center">
              No tienes recordatorios pendientes. 🎉
            </Text>
          </View>
        }
      />
    </View>
  );
}
