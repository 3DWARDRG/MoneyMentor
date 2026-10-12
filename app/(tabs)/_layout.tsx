import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import { Platform } from "react-native";
import "../../global.css";
export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? "#58a5ff" : "#2563eb",
        tabBarInactiveTintColor: isDark ? "#97a4bb" : "#8a8278",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          android: {
            position: "absolute",
            backgroundColor: isDark
              ? "rgba(10,17,31,0.86)"
              : "rgba(255,255,255,0.92)",
            borderTopColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.08)",
          },
          default: {
            backgroundColor: isDark
              ? "rgba(10,17,31,0.86)"
              : "rgba(255,255,255,0.92)",
            borderTopColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.08)",
          },
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "inter",
        },
      }}
    >
      {/* ✅ ESTOS SÍ SE QUEDAN (Son tus pestañas reales) */}
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
        name="reminders"
        options={{
          title: "Recordatorios",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="alarm" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="ai"
        options={{
          title: "Asistente",
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="sparkles" color={color} />
          ),
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
      {/* 👻 LAS PESTAÑAS "FANTASMA" OCULTAS */}
      {/* Si tienes archivos de accounts, goals o transactions dentro de (tabs), ocúltalos así: */}
      <Tabs.Screen name="accounts/index" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="transactions" options={{ href: null }} />
    </Tabs>
  );
}
