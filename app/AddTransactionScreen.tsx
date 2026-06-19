import { database } from "@/database";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";

const { width: PAGE_WIDTH } = Dimensions.get("window");

export default function AddTransactionScreen() {
  const { userId } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
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

  // 🔥 Array de categorías por defecto (mismo que usas en ensureLocalUser)
  const DEFAULT_CATEGORIES = [
    // Gastos
    { id: "default_1", name: "Comida", icon_image: "🍔", type: "expense" },
    { id: "default_2", name: "Transporte", icon_image: "🚗", type: "expense" },
    {
      id: "default_3",
      name: "Entretenimiento",
      icon_image: "🎬",
      type: "expense",
    },
    { id: "default_4", name: "Salud", icon_image: "🏥", type: "expense" },
    { id: "default_5", name: "Educación", icon_image: "📚", type: "expense" },
    { id: "default_6", name: "Servicios", icon_image: "💡", type: "expense" },
    { id: "default_7", name: "Ropa", icon_image: "👕", type: "expense" },
    {
      id: "default_8",
      name: "Supermercado",
      icon_image: "🛒",
      type: "expense",
    },
    { id: "default_9", name: "Café", icon_image: "☕", type: "expense" },
    { id: "default_10", name: "Gimnasio", icon_image: "💪", type: "expense" },
    // Ingresos
    { id: "default_11", name: "Salario", icon_image: "💰", type: "income" },
    { id: "default_12", name: "Freelance", icon_image: "💻", type: "income" },
    { id: "default_13", name: "Regalo", icon_image: "🎁", type: "income" },
    { id: "default_14", name: "Inversión", icon_image: "📈", type: "income" },
    { id: "default_15", name: "Reembolso", icon_image: "🔄", type: "income" },
    { id: "default_16", name: "Venta", icon_image: "🏷️", type: "income" },
    {
      id: "default_17",
      name: "Otros ingresos",
      icon_image: "💵",
      type: "income",
    },
  ];

  useFocusEffect(
    useCallback(() => {
      const loadCategories = async () => {
        if (!userId) return;
        try {
          const catsCollection = database.get("categories");
          const dbCategories = await catsCollection
            .query(Q.where("user_id", userId))
            .fetch();

          // Convertir las categorías de BD a un formato comparable (con id real)
          const dbCategoriesFormatted = dbCategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            icon_image: cat.icon_image,
            type: cat.type,
          }));
          // Combinar con las genéricas, evitando duplicados por nombre y tipo
          const allCategories = [...DEFAULT_CATEGORIES];
          for (const dbCat of dbCategoriesFormatted) {
            const exists = allCategories.some(
              (genCat) =>
                genCat.name === dbCat.name && genCat.type === dbCat.type,
            );
            if (!exists) {
              allCategories.push(dbCat);
            }
          }

          setCategories(allCategories);
          if (allCategories.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(allCategories[0].id);
          }
          console.log(
            `📦 Categorías totales: ${allCategories.length} (${DEFAULT_CATEGORIES.length} genéricas + ${dbCategoriesFormatted.length} de BD)`,
          );
        } catch (error) {
          console.error("Error loading categories:", error);
          // En caso de error, al menos mostrar las genéricas
          setCategories(DEFAULT_CATEGORIES);
          if (DEFAULT_CATEGORIES.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(DEFAULT_CATEGORIES[0].id);
          }
        }
      };
      loadCategories();
    }, [userId]),
  );

  const handleAmountChange = (text: string) => {
    setAmountRaw(formatCOP(text));
  };

  const handleSave = async () => {
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
      let finalCategoryId = selectedCategoryId;

      // Si es una categoría temporal (default_), buscamos o creamos la real
      if (selectedCategoryId?.startsWith("default_")) {
        const selectedCat = categories.find((c) => c.id === selectedCategoryId);
        if (selectedCat) {
          const catsCollection = database.get("categories");
          // Buscar por nombre y user_id
          const existing = await catsCollection
            .query(
              Q.where("user_id", userId),
              Q.where("name", selectedCat.name),
            )
            .fetch();
          if (existing.length > 0) {
            finalCategoryId = existing[0].id;
          } else {
            // Crear la categoría real
            await database.write(async () => {
              const newCat = await catsCollection.create((record: any) => {
                record.user_id = userId;
                record.name = selectedCat.name;
                record.icon_image = selectedCat.icon_image;
                record.type = selectedCat.type;
              });
              finalCategoryId = newCat.id;
            });
          }
        }
      }

      const dateTimestamp = Date.now();
      await database.write(async () => {
        const txCollection = database.get("transactions");
        await txCollection.create((record: any) => {
          record.user_id = userId;
          record.date = dateTimestamp;
          record.amount = numericAmount;
          record.description = description.trim() || "Sin descripción";
          record.type = transactionType;
          record.category_id = finalCategoryId;
        });
      });

      Alert.alert("Éxito", "Transacción guardada", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Error", error.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  // Renderizado inline de categorías (carrusel horizontal)
  const renderCategories = () => {
    if (categories.length === 0) {
      return (
        <Text className="text-gray-500 text-center">
          No hay categorías. Reinicia la app si acabas de instalar.
        </Text>
      );
    }
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row"
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setSelectedCategoryId(cat.id)}
            className={`mx-2 p-3 rounded-full items-center justify-center ${
              selectedCategoryId === cat.id ? "bg-blue-500" : "bg-gray-200"
            }`}
            style={{ minWidth: 70 }}
          >
            <Text
              className={`text-xl ${selectedCategoryId === cat.id ? "text-white" : "text-gray-700"}`}
            >
              {cat.icon_image || "📁"}
            </Text>
            <Text
              className={`text-xs mt-1 ${selectedCategoryId === cat.id ? "text-white" : "text-gray-700"}`}
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
        {/* Header */}
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

        {/* Tipo */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Tipo</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setTransactionType("income")}
              className={`flex-1 p-3 border-2 rounded-lg items-center ${
                transactionType === "income"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200"
              }`}
            >
              <Text className="font-medium">Ingreso</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTransactionType("expense")}
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

        {/* Monto */}
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

        {/* Categorías */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Categoría *
          </Text>
          {renderCategories()}
        </View>

        {/* Fecha */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Fecha</Text>
          <Calendar
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
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

        {/* Comentarios */}
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

        {/* Botón guardar */}
        <TouchableOpacity
          className="bg-blue-600 py-4 rounded-lg items-center"
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
