import FloatingActionButton from "@/components/FloatingActionButton";
import RemindersList from "@/components/RemindersList";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";
import { scheduleTestNotification } from "@/services/pushNotifications";
import React from "react";
import { Button, View , Text} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Reminders() {
  return (
    <SafeAreaView className="flex-1" edges={["bottom", "left", "right"]}>
      <ScreenBackdrop />
      <View className=" flex-1">
        <RemindersList />
        <FloatingActionButton href="/reminders/new" />
      </View>
    </SafeAreaView>
  );
}
