import { Stack } from "expo-router";
import "../../../global.css";

export default function GoalsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
