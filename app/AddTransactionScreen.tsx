import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { Svg, Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Calendar,
  LocaleConfig,
  CalendarProvider,
  ExpandableCalendar,
} from "react-native-calendars";

import { router } from "expo-router";
export default function AddTransactionScreen() {
  const [selected, setSelected] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [transactionType, setTransactionType] = useState<
    "income" | "expense" | null
  >(null);
  const [value, setValue] = useState("");
  const formatCOP = (text: string) => {
    // Elimina cualquier caracter no numérico
    const numericText = text.replace(/\D/g, "");

    // Formatea a miles con puntos
    return numericText.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  const selectedDateRef = useRef("");

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-5">
        {/* Header */}
        <View className="flex flex-row items-center justify-between mb-6">
          <TouchableOpacity className="h-10 w-10 rounded-full bg-gray-100 items-center justify-center">
            <Svg
              className="h-5 w-5 text-gray-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              onPress={() => router.push('/(tabs)')}
            >
              <Path d="M15 19l-7-7 7-7" />
            </Svg>
          </TouchableOpacity>
          <Text className="text-xl font-bold">Nueva transacción</Text>
          <View className="w-10" />
        </View>

        {/* Form */}
        <View className="space-y-6">
          {/* Transaction Type */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Tipo de transacción
            </Text>
            <View className="grid grid-cols-2 gap-3">
              <TouchableOpacity
                onPress={() => setTransactionType("income")}
                className={`flex flex-row flex-wrap-reverse  justify-center items-center p-4 border-2 rounded-lg transition-all ${
                  transactionType === "income"
                    ? "border-green-500"
                    : "border-gray-200"
                }`}
              >
                <View>
                  <Text className="font-medium">Ingreso</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTransactionType("expense")}
                className={`flex flex-row flex-wrap-reverse items-center justify-center  p-4 border-2 rounded-lg transition-all ${
                  transactionType === "expense"
                    ? "border-red-500"
                    : "border-gray-200"
                }`}
              >
                <Text className="font-medium">Gasto</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount */}
          <View>
            <Text className="text-sm font-medium text-gray-700 my-2">
              Monto *
            </Text>
            <View className="relative">
              <Text className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                $
              </Text>
              <TextInput
                className="pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-lg"
                keyboardType="numeric"
                value={value}
                onChangeText={(text) => {
                  const formatted = formatCOP(text);
                  setValue(formatted);
                }}
                placeholder="Ingrese un valor"
              />
            </View>
          </View>

          {/* Category */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Categoría *
            </Text>
            <View className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <Text className="text-gray-400 italic">
                (Selector de categoría aquí)
              </Text>
            </View>
          </View>

          {/* Account */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Cuenta
            </Text>
            <View className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex flex-row items-center">
              <View className="h-8 w-8 bg-blue-600 rounded-full items-center justify-center mr-3">
                <Text className="text-white text-xs font-bold">B</Text>
              </View>
              <View>
                <Text className="font-medium text-gray-900">BBVA</Text>
                <Text className="text-xs text-gray-500">Cuenta principal</Text>
              </View>
            </View>
          </View>

          {/* Date */}
          <View className="my-6">
            <Text className="text-sm font-medium text-gray-700 my-2">
              Fecha
            </Text>
            <CalendarProvider date={selected} >
              <ExpandableCalendar
              onDayPress={(day) => setSelected(day.dateString)}
              enableSwipeMonths={ true }
                pastScrollRange={2} // Meses anteriores que se pueden mostrar
                futureScrollRange={2} // Meses futuros a precargar
                closeOnDayPress={true}
                calendarWidth={400}
                markedDates={{
                  [selected]: { selected: true, selectedColor: "red" },
                }}
              />
            </CalendarProvider>
            <TextInput
              className="px-4 py-3 border mt-4 border-gray-300 rounded-lg"
              value={selected}
            />
          </View>
          {/* Comments */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Comentarios
            </Text>
            <TextInput
              multiline
              numberOfLines={3}
              className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 mb-6"
              placeholder="Agrega una nota sobre esta transacción (opcional)"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity className="w-full bg-blue-600 py-4 rounded-lg items-center">
            <Text className="text-white font-medium">Guardar transacción</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
