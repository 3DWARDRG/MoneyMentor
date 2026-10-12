import { Stack } from "expo-router";
import "../../../global.css";

export default function AiLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false , title: "Chat IA/OCR" }} />
      <Stack.Screen name="settings" options={{ title: "Configurar IA", headerTitleAlign: "center" }} />
    </Stack>
  );
}
