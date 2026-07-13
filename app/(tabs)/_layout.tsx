import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import "../../global.css";
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "dark"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          android: {
            position: "absolute",
          },
          default: {},
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Georgia",
          fontWeight: "300",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => (
            <IconSymbol color={color} size={28} name="house.fill" />
          ),
        }}
      />

      <Tabs.Screen
        name="reminders/index"
        options={{
          title: "Recordatorios",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="alarm" color={color} />
          ),
        }}
      />

            <Tabs.Screen
        name="reminders/new"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="accounts/index"
        options={{
          title: "Cuentas",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="chevron.left.forwardslash.chevron.right"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="accounts/new"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="accounts/[id]"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="transactions"
        options={{
          href: null,
          tabBarStyle: { display: "none" }, // oculta barra al estar en esa pantalla
        }}
      />

      <Tabs.Screen
        name="transactions/[id]"
        options={{
          href: null, // no aparece en navbar
          tabBarStyle: { display: "none" }, // oculta barra al estar en esa pantalla
        }}
      />
      <Tabs.Screen
        name="transactions/new"
        options={{
          href: null, // no aparece en navbar
          tabBarStyle: { display: "none" }, // oculta barra al estar en esa pantalla
        }}
      />

      <Tabs.Screen
        name="statistics"
        options={{
          title: "Estadisticas",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="chart.line.uptrend.xyaxis"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
