// app/(tabs)/index.tsx
import BalanceCard from "@/components/BalanceCard";
import CardBackdrop from "@/components/ui/CardBackdrop";
import FloatingActionButton from "@/components/FloatingActionButton";
import RecentGoals from "@/components/RecentGoals";
import RecentTransactions from "@/components/RecentTransactions";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";
import { database } from "@/database";
import { User } from "@/database/models/mlUser";
import { useGoals } from "@/hooks/useGoals";
import { useAuthStore } from "@/store/useAuthStore";
import { Href } from "expo-router";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
  }).format(value);

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 160,
  mass: 0.9,
  overshootClamping: false,
};

export default function Index() {
  const  userId  = useAuthStore((s) => s.userId);
  const [userName, setUserName] = useState("Usuario");
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  const progress = useSharedValue(0);
  const startProgress = useSharedValue(0);

  const {
    goals,
    loading: goalsLoading,
    summary: goalsSummary,
  } = useGoals(userId ?? "");

  useEffect(() => {
    const loadUserName = async () => {
      if (userId) {
        try {
          const user = await database.get<User>("users").find(userId);
          setUserName(user.names || "Usuario");
        } catch (error) {
          console.error("Error cargando nombre:", error);
        }
      }
    };
    loadUserName();
  }, [userId]);

  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-10, 10])
    .onBegin(() => {
      startProgress.value = progress.value;
    })
    .onUpdate((e) => {
      const height = containerHeight;
      if (height <= 0) return;
      const raw = -e.translationY / height;
      const next = startProgress.value + raw * 0.7;
      progress.value = Math.max(0, Math.min(1, next));
    })
    .onEnd((e) => {
      const startedFromBalance = startProgress.value < 0.5;
      const p = progress.value;

      let target: number;
      if (startedFromBalance) {
        target = p > 0.35 || e.velocityY < -600 ? 1 : 0;
      } else {
        target = p < 0.65 || e.velocityY > 600 ? 0 : 1;
      }

      progress.value = withSpring(target, SPRING_CONFIG);

      const changed = Math.round(target) !== Math.round(startProgress.value);
      if (changed) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        runOnJS(setActiveIndex)(target);
      }
    });

  const balanceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * containerHeight * 0.12 },
      { scaleY: 1 + progress.value * 0.08 },
    ],
    transformOrigin: "top",
  }));

  const goalsStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: containerHeight * (1 - progress.value) },
      { scaleY: 1 + (1 - progress.value) * 0.02 },
    ],
    zIndex: 2,
  }));

  return (
    <SafeAreaView className="bg-deep dark:bg-deep-dark flex-1">
      <ScreenBackdrop />
      <View className="flex-1">
        <View className="p-4 box-border">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-2xl font-medium text-ink dark:text-ink-dark">
                Hola, {userName}
              </Text>
              <Text className="text-muted dark:text-muted-dark text-lg font-inter">
                Bienvenido de nuevo
              </Text>
            </View>
            <AvatarRing />
          </View>
        </View>

        <View
          className="flex-1"
          onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
        >
          {containerHeight > 0 && (
            <GestureDetector gesture={pan}>
              <View className="flex-1" style={{ overflow: "hidden" }}>
                <Animated.View
                  style={[StyleSheet.absoluteFill, goalsStyle]}
                  className="rounded-t-3xl border border-black/10 dark:border-white/15"
                >
                  <CardBackdrop
                    glowColor="#1d7df0"
                    glowOpacity={0.14}
                    glowSize={260}
                    glowBottom={-120}
                    glowLeft={-120}
                  />
                  <View className="items-center pt-3 pb-0">
                    <View className="w-12 h-1.5 rounded-full bg-black/15 dark:bg-white/20" />
                  </View>
                  <View className="flex-1 p-4">
                    <View className="mb-6">
                      <BalanceCard
                        title="Mis Metas"
                        mainValue={formatCOP(goalsSummary.totalAmount)}
                        stats={[
                          {
                            label: "Completadas",
                            value: `${goalsSummary.completedGoals}`,
                            labelClass: "text-income dark:text-income-dark",
                          },
                          {
                            label: "Total metas",
                            value: `${goalsSummary.totalGoals}`,
                            labelClass: "text-ink dark:text-ink-dark",
                          },
                        ]}
                        loading={goalsLoading}
                      />
                    </View>
                    <RecentGoals goals={goals} loading={goalsLoading} />
                  </View>
                </Animated.View>

                <Animated.View
                  style={[StyleSheet.absoluteFill, balanceStyle]}
                >
                  <View className="flex-1 p-4">
                    <BalanceCard onAccountChange={setSelectedAccountId} />
                    <RecentTransactions accountId={selectedAccountId} />
                  </View>
                </Animated.View>
              </View>
            </GestureDetector>
          )}
        </View>

        <View className="items-center pb-2">
          <Text className="text-xs text-muted dark:text-muted-dark">
            {activeIndex === 0
              ? "Desliza hacia arriba para ver tus metas"
              : "Desliza hacia abajo para volver a tu balance"}
          </Text>
        </View>
      </View>

      <View className="relative">
        <FloatingActionButton
          href={
            activeIndex === 1
              ? "/goals/new"
              : ({
                  pathname: "/transactions/new",
                  params: selectedAccountId
                    ? { accountId: selectedAccountId }
                    : {},
                } as Href)
          }
        />
      </View>
    </SafeAreaView>
  );
}

const AvatarRing = () => {
  const rawId = "avatarRing";
  const { colorScheme } = useColorScheme();

  return (
    <View style={{ padding: 2, borderRadius: 999 }}>
      <Svg
        width={56}
        height={56}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id={rawId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#ffca67" />
            <Stop offset="58%" stopColor="#fb5a70" />
            <Stop offset="100%" stopColor="#6077ff" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${rawId})`} rx={999} />
      </Svg>
      <View
        className="min-w-14 h-14 rounded-full overflow-hidden"
        style={{
          borderWidth: 2,
          borderColor: colorScheme === "dark" ? "#0d1930" : "#faf8f4",
        }}
      >
        <Image
          source={{
            uri: "https://img.freepik.com/vector-premium/icono-circulo-usuario-anonimo-ilustracion-vector-estilo-plano-sombra_520826-1931.jpg",
          }}
          className="w-full h-full"
        />
      </View>
    </View>
  );
};
