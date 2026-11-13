import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import "../../../global.css"
import { IconSymbol } from "@/components/ui/IconSymbol";


export default function RemimdersLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Stack>
      <Stack.Screen name="index" options={{ 
      headerStyle:{
        backgroundColor: isDark ? "#0c1324" : "#ffffff"
        
      },
      headerTintColor: isDark ? "#f6f8ff" : "#1c1917",
      headerTitleStyle: { fontFamily: "inter", fontSize: 17, fontWeight: "600" },
      title: "Recordatorios"

       }}/>
      <Stack.Screen name="[id]" options={{ title: "Detalle Recordatorio" }} />
      <Stack.Screen name="new" options={{ title: "Nuevo Recordatorio"  }} />
    </Stack>
  );
}
