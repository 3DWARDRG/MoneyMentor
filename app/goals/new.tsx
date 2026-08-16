import { database } from "@/database";
import { FinancialGoal } from "@/database/models/mlFinancialGoal";
import { useConfirmLeave } from "@/hooks/useConfirmLeave";
import { useDirtyState } from "@/hooks/useDirtyState";
import { useAuthStore } from "@/store/useAuthStore";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import KeyboardAvoidingScrollView from "@/components/KeyboardAvoidingScrollView";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const localDateStringToTimestamp = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
};

export default function GoalFormScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? "Editar meta" : "Nueva meta",
    });
  }, [navigation, isEditing]);

  const { userId, selectedUserId } = useAuthStore();
  const activeUserId = userId ?? selectedUserId;
  const todayString = formatLocalDate(new Date());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [deadline, setDeadline] = useState(todayString);
  const [loading, setLoading] = useState(false);

  const formatCOP = useCallback((text: string) => {
    const numeric = text.replace(/\D/g, "");
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }, []);

  const { isDirty, resetBaseline } = useDirtyState([
    title,
    description,
    amountRaw,
    deadline,
  ]);

  const { allowLeave } = useConfirmLeave({
    enabled: isDirty,
    message: isEditing
      ? "Si sales ahora, los cambios de la meta no se guardarán."
      : "Si sales ahora, la meta no se creará.",
  });

  useEffect(() => {
    const loadGoal = async () => {
      if (isEditing && id) {
        try {
          const goal = await database
            .get<FinancialGoal>("financial_goals")
            .find(id);

          setTitle(goal.title ?? "");
          setDescription(goal.description ?? "");
          setAmountRaw(formatCOP(String(goal.amount ?? 0)));
          setDeadline(formatLocalDate(new Date(goal.deadline)));
          resetBaseline();
        } catch (error) {
          console.error("Error cargando la meta a editar:", error);
          Alert.alert("Error", "No se pudo cargar la meta.");
          allowLeave();
          router.back();
        }
      }
    };
    loadGoal();
  }, [id, isEditing, formatCOP, resetBaseline, allowLeave]);

  useEffect(() => {
    if (!isEditing) {
      resetBaseline();
    }
  }, [isEditing, resetBaseline]);

  const validate = (): boolean => {
    console.log("💾 validate → userId:", userId, "| selectedUserId:", selectedUserId, "| activeUserId:", activeUserId);

    if (!activeUserId) {
      Alert.alert("Error", "No se encontró el usuario actual");
      return false;
    }

    if (!title.trim()) {
      Alert.alert("Error", "Ingresa un título para la meta");
      return false;
    }

    const numericAmount = Number(amountRaw.replace(/\./g, ""));
    if (!amountRaw || numericAmount <= 0) {
      Alert.alert("Error", "Ingresa un monto válido");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const numericAmount = Number(amountRaw.replace(/\./g, ""));

    setLoading(true);

    try {
      await database.write(async () => {
        if (isEditing && id) {
          const goal = await database
            .get<FinancialGoal>("financial_goals")
            .find(id);
          const savedAmount = Number(goal.savedAmount ?? 0);
          const recomputedProgress = Math.min(
            100,
            Math.round((savedAmount / (numericAmount || 1)) * 100),
          );
          await goal.update((record: any) => {
            record.title = title.trim();
            record.description = description.trim();
            record.amount = numericAmount;
            record.deadline = localDateStringToTimestamp(deadline);
            record.progress = recomputedProgress;
          });
          console.log("✅ Meta ACTUALIZADA:", goal.id, "| userId:", goal.userId);
        } else {
          const created = await database
            .get<FinancialGoal>("financial_goals")
            .create((record: any) => {
              record.userId = activeUserId;
              record.title = title.trim();
              record.description = description.trim();
              record.amount = numericAmount;
              record.deadline = localDateStringToTimestamp(deadline);
              record.creationDate = Date.now();
              record.progress = 0;
            });
          console.log(
            "✅ Meta CREADA:",
            created.id,
            "| userId accessor:",
            created.userId,
            "| raw:",
            (created as any)._raw?.user_id,
            "| título:",
            created.title,
          );

          const allGoals = await database
            .get<FinancialGoal>("financial_goals")
            .query()
            .fetch();
          console.log(
            "🔍 DUMP metas en DB:",
            allGoals.length,
            allGoals.map((g) => ({
              id: g.id,
              userId: g.userId,
              raw: (g as any)._raw?.user_id,
              title: g.title,
            })),
          );
        }
      });

      console.log("💾 Save finalizado. Volviendo atrás...");
      allowLeave();
      router.back();
    } catch (error: any) {
      console.error("Save goal error:", error);
      Alert.alert("Error", error.message || "No se pudo guardar la meta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-deep dark:bg-deep-dark" edges={["bottom", "left", "right"]}>
      <ScreenBackdrop />
      <KeyboardAvoidingScrollView className="flex-1 px-5 mt-4">
        <View className="mb-4">
          <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-2">
            Título *
          </Text>
          <TextInput
            className="px-4 py-3 border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark rounded-lg text-ink dark:text-ink-dark"
            placeholder="Ej: Viaje a la playa"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-2">Monto *</Text>
          <View className="relative">
            <Text className="absolute left-3 top-3 text-muted dark:text-muted-dark text-lg">$</Text>
            <TextInput
              className="pl-8 pr-4 py-3 border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark rounded-lg text-lg text-ink dark:text-ink-dark"
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9ca3af"
              value={amountRaw}
              onChangeText={(text) => setAmountRaw(formatCOP(text))}
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-2">
            Fecha límite *
          </Text>
          <Calendar
            onDayPress={(day: any) => setDeadline(day.dateString)}
            minDate={todayString}
            markedDates={{
              [deadline]: { selected: true, selectedColor: "#4b9aff" },
            }}
            current={deadline}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e7e2d8",
              backgroundColor: isDark ? "#0a1220" : "#ffffff",
              marginBottom: 10,
            }}
            theme={{
              calendarBackground: isDark ? "#0a1220" : "#ffffff",
              textSectionTitleColor: isDark ? "#97a4bb" : "#7a7266",
              selectedDayBackgroundColor: "#4b9aff",
              selectedDayTextColor: "#ffffff",
              todayTextColor: "#4b9aff",
              dayTextColor: isDark ? "#f6f8ff" : "#1c1917",
              monthTextColor: isDark ? "#f6f8ff" : "#1c1917",
              arrowColor: "#4b9aff",
              textDisabledColor: isDark ? "#3a4a63" : "#d0cbbf",
            }}
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-2">
            Descripción
          </Text>
          <TextInput
            multiline
            numberOfLines={3}
            className="border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark rounded-lg p-3 text-ink dark:text-ink-dark"
            placeholder="Opcional"
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <TouchableOpacity
          className={`${loading ? "opacity-50" : ""} bg-accent dark:bg-accent-dark py-4 rounded-lg items-center mb-4`}
          onPress={handleSave}
          disabled={loading}
        >
          <Text className="text-white font-medium text-base">
            {loading
              ? "Guardando..."
              : isEditing
                ? "Guardar cambios"
                : "Guardar meta"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingScrollView>
    </SafeAreaView>
  );
}
