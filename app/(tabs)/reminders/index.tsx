import FloatingActionButton from "@/components/FloatingActionButton";
import UpcomingReminders from "@/components/UpcomingReminders";
import { scheduleTestNotification } from "@/services/notifications";
import React from "react";
import { Button, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Reminders() {
  return (
    <SafeAreaView className="  flex-1">
      <View className=" flex-1">
        <UpcomingReminders />
        <Button
          title="Probar Notificación"
          onPress={() => scheduleTestNotification("Internet", 50)}
        />
        <FloatingActionButton href="/reminders/new" />
      </View>
    </SafeAreaView>
  );
}
