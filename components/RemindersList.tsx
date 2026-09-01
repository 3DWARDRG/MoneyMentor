import { database } from "@/database";
import { Event } from "@/database/models/mlEvent";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";
import React, { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import ReminderItem2 from "./ReminderItem2";

export default function RemindersList() {
  const userId = useAuthStore((s) => s.userId);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!userId) {
      setEvents([]);
      return;
    }

    const subscription = database.collections
      .get<Event>("events")
      .query(
        Q.where("user_id", userId),
        Q.where("status", "pending"),
        Q.sortBy("start_date", Q.asc),
      )
      .observe()
      .subscribe({
        next: (rows) => setEvents(rows),
        error: (error) => {
          console.error("❌ Error observando recordatorios:", error);
          setEvents([]);
        },
      });

    return () => subscription.unsubscribe();
  }, [userId]);

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
