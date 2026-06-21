import { database } from "@/database";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";

export default function AddTransactionScreen() {
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

  const { userId } = useAuthStore();
  const todayString = formatLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
  const [transactionType, setTransactionType] = useState<
    "income" | "expense" | null
  >(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const formatCOP = (text: string) => {
    const numeric = text.replace(/\D/g, "");
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useFocusEffect(
    useCallback(() => {
      const loadCategories = async () => {
        if (!userId) return;

        try {
          const catsCollection = database.get("categories");
          const dbCategories = await catsCollection
            .query(Q.where("user_id", userId))
            .fetch();

          const formatted = dbCategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            iconImage: cat.iconImage,
            type: cat.type,
          }));

          setCategories(formatted);

          if (formatted.length > 0) {
            setSelectedCategoryId((prev) =>
              prev && formatted.some((cat) => cat.id === prev)
                ? prev
                : formatted[0].id,
            );
          }
          console.log(
            dbCategories.map((cat: any) => ({
              name: cat.name,
              iconImage: cat.iconImage,
            })),
          );

          console.log(`📦 Categorías cargadas: ${formatted.length}`);
        } catch (error) {
          console.error("❌ Error cargando categorías:", error);
        }
      };

      loadCategories();
    }, [userId]),
  );

  const handleAmountChange = (text: string) => {
    setAmountRaw(formatCOP(text));
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert("Error", "No se encontró el usuario actual");
      return;
    }

    if (!transactionType) {
      Alert.alert("Error", "Selecciona tipo de transacción");
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert("Error", "Selecciona una categoría");
      return;
    }

    const numericAmount = Number(amountRaw.replace(/\./g, ""));
    if (!amountRaw || numericAmount <= 0) {
      Alert.alert("Error", "Ingresa un monto válido");
      return;
    }

    setLoading(true);

    try {
      const selectedDateTimestamp = localDateStringToTimestamp(selectedDate);

      await database.write(async () => {
        const txCollection = database.get("transactions");

        await txCollection.create((record: any) => {
          record.userId = userId;
          record.date = selectedDateTimestamp;
          record.amount = numericAmount;
          record.description = description.trim() || "Sin descripción";
          record.type = transactionType;
          record.categoryId = selectedCategoryId;
        });
      });

      router.back();
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Error", error.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  const renderCategories = () => {
    if (categories.length === 0) {
      return (
        <Text className="text-gray-500 text-center">
          No hay categorías disponibles para este usuario.
        </Text>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row"
      >
        {categories
          .filter((cat) => !transactionType || cat.type === transactionType)
          .map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategoryId(cat.id)}
              className={`mx-2 p-3 rounded-full items-center justify-center ${
                selectedCategoryId === cat.id ? "bg-blue-500" : "bg-gray-200"
              }`}
              style={{ minWidth: 70 }}
            >
              <Text
                className={`text-xl ${
                  selectedCategoryId === cat.id ? "text-white" : "text-gray-700"
                }`}
              >
                {cat.iconImage || "📁"}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  selectedCategoryId === cat.id ? "text-white" : "text-gray-700"
                }`}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-5">
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
            >
              <Path
                d="M15 19l-7-7 7-7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <Text className="text-xl font-bold">Nueva transacción</Text>
          <View className="w-10" />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Tipo</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => {
                setTransactionType("income");
                const firstIncomeCategory = categories.find(
                  (cat) => cat.type === "income",
                );
                setSelectedCategoryId(firstIncomeCategory?.id ?? null);
              }}
              className={`flex-1 p-3 border-2 rounded-lg items-center ${
                transactionType === "income"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200"
              }`}
            >
              <Text className="font-medium">Ingreso</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTransactionType("expense");
                const firstExpenseCategory = categories.find(
                  (cat) => cat.type === "expense",
                );
                setSelectedCategoryId(firstExpenseCategory?.id ?? null);
              }}
              className={`flex-1 p-3 border-2 rounded-lg items-center ${
                transactionType === "expense"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200"
              }`}
            >
              <Text className="font-medium">Gasto</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Monto *
          </Text>
          <View className="relative">
            <Text className="absolute left-3 top-3 text-gray-500 text-lg">
              $
            </Text>
            <TextInput
              className="pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-lg"
              keyboardType="numeric"
              placeholder="0"
              value={amountRaw}
              onChangeText={handleAmountChange}
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Categoría *
          </Text>
          {renderCategories()}
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Fecha</Text>
          <Calendar
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            maxDate={todayString}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: "#2563eb" },
            }}
            current={selectedDate}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              backgroundColor: "white",
              marginBottom: 10,
            }}
            theme={{
              todayTextColor: "#2563eb",
              arrowColor: "#2563eb",
              selectedDayBackgroundColor: "#2563eb",
            }}
          />
          <TextInput
            className="px-4 py-3 border border-gray-300 rounded-lg"
            value={selectedDate}
            editable={false}
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Comentarios
          </Text>
          <TextInput
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg p-3 text-gray-700"
            placeholder="Opcional"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <TouchableOpacity
          className={`${loading ? "opacity-50" : ""} bg-blue-600 py-4 rounded-lg items-center`}
          onPress={handleSave}
          disabled={loading}
        >
          <Text className="text-white font-medium text-base">
            {loading ? "Guardando..." : "Guardar transacción"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
