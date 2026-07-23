import { Stack } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import "../../../global.css"



export default function TransactionsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false,
      headerStyle:{
        backgroundColor: "#fff"
      }
       }}/>
      <Stack.Screen name="[id]" options={{ title: "Detalle transacción" }} />
      <Stack.Screen name="new" options={{ title: "Nueva transacción"  }} />
    </Stack>
  );
}
