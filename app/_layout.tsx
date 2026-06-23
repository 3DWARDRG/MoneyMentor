import { Buffer } from "buffer";
import "../global.css";

global.Buffer = Buffer;

import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SetupPinScreen" />
      <Stack.Screen name="UnlockScreen" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="SelectUserScreen" />
    </Stack>
  );
}
