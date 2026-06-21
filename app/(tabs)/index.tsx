import BalanceCard from "@/components/BalanceCard";
import FloatingActionButton from "@/components/FloatingActionButton";
import RecentTransactions from "@/components/RecentTransactions";
import { database } from "@/database";
import { User } from "@/database/models/mlUser";
import { useAuthStore } from "@/store/useAuthStore";
import React, { useEffect, useState , useCallback } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from '@react-navigation/native';
import DebugDB from '@/components/DebugDB';





export default function Index() {
  const { userId } = useAuthStore();
  const [userName, setUserName] = useState("Usuario");
  const [dashboardKey, setDashboardKey] = useState(0);

  const refreshDashboard = useCallback(() => {
    console.log("🔄 Forzando refresco del dashboard desde DebugDB");
    setDashboardKey(prev => prev + 1);
  }, []);

  // También refrescar automáticamente al recibir foco
  useFocusEffect(
    useCallback(() => {
      console.log("📱 Dashboard recibió foco, refrescando...");
      setDashboardKey(prev => prev + 1);
    }, [])
  );
  useEffect(() => {
    const loadUserName = async () => {
      if (userId) {
        try {
          const usersCollection = database.get<User>("users");
          const user = await usersCollection.find(userId);
          setUserName(user.names || "Usuario");
        } catch (error) {
          console.error("Error cargando nombre:", error);
        }
      }
    };
    loadUserName();
  }, [userId]);

  

  return (
    <SafeAreaView className="bg-gray-50 flex-1">
      <View key={dashboardKey} className="flex-1 bg-gray-700">
        <View className="flex-1 box-border bg-white p-4">
          <View className="min-h-10">
            <View className="p-4">
              <View className="flex-row justify-between items-center mb-6">
                <View>
                  {/* 👇 SOLO CAMBIA ESTA LÍNEA: "Edward" → userName */}
                  <Text className="text-2xl font-medium">Hola, {userName}</Text>
                  <Text className="text-gray-950 text-lg font-inter">
                    Bienvenido de nuevo
                  </Text>
                </View>
                <View className="min-w-20 h-20 rounded-full overflow-hidden">
                  <Image
                    source={{
                      uri: "https://img.freepik.com/vector-premium/icono-circulo-usuario-anonimo-ilustracion-vector-estilo-plano-sombra_520826-1931.jpg",
                    }}
                    className="w-full h-full"
                  />
                </View>
              </View>
              <BalanceCard />
            </View>
          </View>
          <View className="flex-1 bg-slate-700 rounded-t-3xl">
            <RecentTransactions />
          </View>
        </View>
      </View>
      <View className="relative">
        <FloatingActionButton />
      </View>
    </SafeAreaView>
  );
}
