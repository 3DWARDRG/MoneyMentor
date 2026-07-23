import { Stack } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import "../../../global.css"
import { IconSymbol } from "@/components/ui/IconSymbol";


export default function RemimdersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ 
      headerStyle:{
        backgroundColor: "#fff"
        
      },
      title: "Recordatorios"

       }}/>
      <Stack.Screen name="[id]" options={{ title: "Detalle Recordatorio" }} />
      <Stack.Screen name="new" options={{ title: "Nuevo Recordatorio"  }} />
    </Stack>
  );
}
