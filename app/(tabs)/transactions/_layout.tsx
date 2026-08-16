import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import "../../../global.css"



export default function TransactionsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false,
      headerStyle:{
        backgroundColor: isDark ? "#0c1324" : "#ffffff"
      }
       }}/>
    </Stack>
  );
}
