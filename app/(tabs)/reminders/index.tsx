import FloatingActionButton from "@/components/FloatingActionButton";
import RemindersList from "@/components/RemindersList";
import { scheduleTestNotification } from "@/services/notifications";
import React from "react";
import { Button, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Reminders() {
  return (
    <SafeAreaView className="  flex-1">
      <View className=" flex-1">
        <RemindersList />
        <Button
          title="Probar Notificación"
          onPress={() => scheduleTestNotification("Internet", 50)}
        />
        <FloatingActionButton href="/reminders/new" />
      </View>
    </SafeAreaView>
  );
}
