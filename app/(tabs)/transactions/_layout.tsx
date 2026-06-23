import { Stack } from "expo-router";

export default function TransactionsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "Detalle transacción" }} />
      <Stack.Screen name="new" options={{ title: "Nueva transacción" }} />
    </Stack>
  );
}
