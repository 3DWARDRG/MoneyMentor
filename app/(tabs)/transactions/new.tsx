import { database } from "@/database";
import { createTransactionRecord } from "@/services/transactionBalanceHelpers";
import { useAuthStore } from "@/store/useAuthStore";
import { Q } from "@nozbe/watermelondb";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type TxType = "income" | "expense" | "transfer";
type TransferTarget = "own" | "person" | "bank";
type FeeType =
  | "maintenance"
  | "annual_fee"
  | "late_fee"
  | "cash_advance_fee"
  | "atm_fee"
  | "other_fee";

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
  const [transactionType, setTransactionType] = useState<TxType | null>(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [destinationAccountId, setDestinationAccountId] = useState<
    string | null
  >(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const [transferTarget, setTransferTarget] = useState<TransferTarget>("own");

  const [installmentsTotal, setInstallmentsTotal] = useState<number | null>(
    null,
  );
  const [installmentsPaid, setInstallmentsPaid] = useState<number | null>(0);

  const [isFinancialFee, setIsFinancialFee] = useState(false);
  const [feeType, setFeeType] = useState<FeeType | null>(null);

  // Sincroniza categoría seleccionada al cambiar tipo
  useEffect(() => {
    if (transactionType === "transfer") {
      setSelectedCategoryId(null);
      return;
    }

    const filtered = categories.filter(
      (cat) => !transactionType || cat.type === transactionType,
    );

    if (filtered.length === 0) {
      setSelectedCategoryId(null);
      return;
    }

    setSelectedCategoryId((prev) =>
      prev && filtered.some((cat) => cat.id === prev) ? prev : filtered[0].id,
    );
  }, [categories, transactionType]);

  // Reset campos al cambiar tipo
  useEffect(() => {
    if (transactionType !== "transfer") {
      setTransferTarget("own");
      setDestinationAccountId(null);
    }

    if (transactionType !== "expense") {
      setInstallmentsTotal(null);
      setInstallmentsPaid(0);
      setIsFinancialFee(false);
      setFeeType(null);
    }
  }, [transactionType]);

  const formatCOP = (text: string) => {
    const numeric = text.replace(/\D/g, "");
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useFocusEffect(
    useCallback(() => {
      const loadFormData = async () => {
        if (!userId) return;

        try {
          const catsCollection = database.get("categories");
          const accCollection = database.get("accounts");

          const [dbCategories, dbAccounts] = await Promise.all([
            catsCollection.query(Q.where("user_id", userId)).fetch(),
            accCollection.query(Q.where("user_id", userId)).fetch(),
          ]);

          const formattedCategories = dbCategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            iconImage: cat.iconImage,
            type: cat.type,
          }));

          const formattedAccounts = dbAccounts
            .filter((acc: any) => acc.isActive !== false)
            .map((acc: any) => ({
              id: acc.id,
              name: acc.name,
              iconImage: acc.iconImage,
              balance: acc.balance ?? 0,
              currency: acc.currency ?? "COP",
              type: acc.type ?? null,
              creditSubtype: acc.creditSubtype ?? null,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          setCategories(formattedCategories);
          setAccounts(formattedAccounts);

          if (formattedAccounts.length > 0) {
            setSelectedAccountId((prev) =>
              prev && formattedAccounts.some((acc) => acc.id === prev)
                ? prev
                : formattedAccounts[0].id,
            );
          }
        } catch (error) {
          console.error("❌ Error cargando formulario:", error);
        }
      };

      loadFormData();
    }, [userId]),
  );

  const selectedAccount = useMemo(
    () => accounts.find((acc) => acc.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  const isSelectedCreditCard =
    selectedAccount?.type === "credit" &&
    selectedAccount?.creditSubtype === "credit_card";

  const showInstallments =
    transactionType === "expense" && isSelectedCreditCard && !isFinancialFee;

  const filteredCategories = categories.filter(
    (cat) => !transactionType || cat.type === transactionType,
  );

  // ─── Validaciones ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (!userId) {
      Alert.alert("Error", "No se encontró el usuario actual");
      return false;
    }

    if (!transactionType) {
      Alert.alert("Error", "Selecciona tipo de transacción");
      return false;
    }

    if (!selectedAccountId) {
      Alert.alert("Error", "Selecciona una cuenta");
      return false;
    }

    if (transactionType === "transfer") {
      if (transferTarget !== "own") {
        Alert.alert(
          "Pendiente",
          "Por ahora solo se soportan transferencias entre tus cuentas.",
        );
        return false;
      }

      if (!destinationAccountId) {
        Alert.alert("Error", "Selecciona una cuenta destino");
        return false;
      }

      if (destinationAccountId === selectedAccountId) {
        Alert.alert(
          "Error",
          "La cuenta destino debe ser distinta a la cuenta origen",
        );
        return false;
      }
    }

    if (
      transactionType !== "transfer" &&
      !isFinancialFee &&
      !selectedCategoryId
    ) {
      Alert.alert("Error", "Selecciona una categoría");
      return false;
    }

    if (isFinancialFee && !feeType) {
      Alert.alert("Error", "Selecciona el tipo de cobro financiero");
      return false;
    }

    if (
      showInstallments &&
      installmentsTotal !== null &&
      installmentsTotal < 1
    ) {
      Alert.alert("Error", "Las cuotas deben ser mayores a 0");
      return false;
    }

    if (
      showInstallments &&
      installmentsPaid !== null &&
      installmentsTotal !== null &&
      installmentsPaid > installmentsTotal
    ) {
      Alert.alert(
        "Error",
        "Las cuotas pagadas no pueden superar las cuotas totales",
      );
      return false;
    }

    const numericAmount = Number(amountRaw.replace(/\./g, ""));
    if (!amountRaw || numericAmount <= 0) {
      Alert.alert("Error", "Ingresa un monto válido");
      return false;
    }

    return true;
  };

  // ─── Guardar ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    const numericAmount = Number(amountRaw.replace(/\./g, ""));
    const dateTimestamp = localDateStringToTimestamp(selectedDate);

    setLoading(true);

    try {
      await createTransactionRecord({
        userId: userId!,
        date: dateTimestamp,
        amount: numericAmount,
        description: description.trim(),
        type: transactionType!,
        accountId: selectedAccountId!,
        destinationAccountId:
          transactionType === "transfer" ? destinationAccountId : null,
        categoryId: isFinancialFee ? null : selectedCategoryId,
        transferTarget: transactionType === "transfer" ? transferTarget : null,
        installmentsTotal: showInstallments ? (installmentsTotal ?? 1) : null,
        installmentsPaid: showInstallments ? (installmentsPaid ?? 0) : null,
        feeType: isFinancialFee ? feeType! : null,
      });

      router.back();
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Error", error.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  // ─── UI ──────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      className="flex-1 "
      edges={["bottom", "left", "right"]} // excluye top
    >
      <ScrollView className="flex-1 px-5  mt-4">
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
          <Text className="text-xl font-bold text-black">
            Nueva transacción
          </Text>
          <View className="w-10 " />
        </View>

        {/* Tipo */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-black mb-2">Tipo</Text>
          <View className="flex-row gap-3">
            {(["income", "expense", "transfer"] as TxType[]).map((type) => {
              const labels: Record<TxType, string> = {
                income: "Ingreso",
                expense: "Gasto",
                transfer: "Transfer",
              };
              const activeColors: Record<TxType, string> = {
                income: "border-green-500 bg-green-50",
                expense: "border-red-500 bg-red-50",
                transfer: "border-blue-500 bg-blue-50",
              };

              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setTransactionType(type)}
                  className={`flex-1 p-3 border-2 rounded-lg items-center ${
                    transactionType === type
                      ? activeColors[type]
                      : "border-gray-900"
                  }`}
                >
                  <Text className="font-medium text-black">{labels[type]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Monto */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-black mb-2">Monto *</Text>
          <View className="relative">
            <Text className="absolute left-3 top-3 text-gray-500 text-lg">
              $
            </Text>
            <TextInput
              className="pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-lg text-black"
              keyboardType="numeric"
              placeholder="0"
              value={amountRaw}
              onChangeText={(text) => setAmountRaw(formatCOP(text))}
            />
          </View>
        </View>

        {/* Cuenta origen */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-black mb-2">
            Cuenta origen *
          </Text>

          {accounts.length === 0 ? (
            <Text className="text-black text-center">
              No hay cuentas activas disponibles.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
              {accounts.map((account) => {
                const isSelected = selectedAccountId === account.id;
                return (
                  <TouchableOpacity
                    key={account.id}
                    onPress={() => setSelectedAccountId(account.id)}
                    className={`mx-2 px-4 py-3 rounded-2xl border ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 "
                        : "bg-white border-gray-200"
                    }`}
                    style={{ minWidth: 150 }}
                  >
                    <Text
                      className={`text-xl mb-1 ${isSelected ? "text-black" : "text-gray-800"}`}
                    >
                      {account.iconImage || "🏦"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className={`font-semibold ${isSelected ? "text-black" : "text-gray-900"}`}
                    >
                      {account.name}
                    </Text>
                    <Text
                      className={`text-xs mt-1 ${isSelected ? "text-blue-100" : "text-gray-500"}`}
                    >
                      {account.currency}{" "}
                      {Number(account.balance ?? 0).toLocaleString("es-CO")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Transferencia — destino */}
        {transactionType === "transfer" && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Destino
            </Text>

            <View className="flex-row gap-3 mb-3">
              {(["own", "person"] as TransferTarget[]).map((target) => (
                <TouchableOpacity
                  key={target}
                  onPress={() => setTransferTarget(target)}
                  className={`flex-1 p-3 border rounded-lg items-center ${
                    transferTarget === target
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <Text className="text-black border-black">
                    {target === "own" ? "Mis cuentas" : "Otra persona"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {transferTarget === "own" && (
              <>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Cuenta destino *
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-row"
                >
                  {accounts
                    .filter((acc) => acc.id !== selectedAccountId)
                    .map((account) => {
                      const isSelected = destinationAccountId === account.id;
                      return (
                        <TouchableOpacity
                          key={account.id}
                          onPress={() => setDestinationAccountId(account.id)}
                          className={`mx-2 px-4 py-3 rounded-2xl border ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600"
                              : "bg-white border-gray-200"
                          }`}
                          style={{ minWidth: 150 }}
                        >
                          <Text
                            className={`text-xl mb-1 ${isSelected ? "text-black" : "text-gray-800"}`}
                          >
                            {account.iconImage || "🏦"}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className={`font-semibold ${isSelected ? "text-black" : "text-gray-900"}`}
                          >
                            {account.name}
                          </Text>
                          <Text
                            className={`text-xs mt-1 ${isSelected ? "text-indigo-100" : "text-gray-500"}`}
                          >
                            {account.currency}{" "}
                            {Number(account.balance ?? 0).toLocaleString(
                              "es-CO",
                            )}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            )}
          </View>
        )}

        {/* Toggle cobro financiero */}
        {transactionType === "expense" && (
          <View className="mb-4">
            <TouchableOpacity
              onPress={() => {
                setIsFinancialFee((prev) => !prev);
                if (!isFinancialFee) {
                  setSelectedCategoryId(null);
                  setInstallmentsTotal(null);
                  setInstallmentsPaid(0);
                } else {
                  setFeeType(null);
                }
              }}
              className={`p-3 border rounded-lg ${
                isFinancialFee
                  ? "border-amber-500 bg-amber-50"
                  : "border-gray-200"
              }`}
            >
              <Text className="font-medium">Es un cobro financiero</Text>
              <Text className="text-xs text-gray-500 mt-1">
                Úsalo para cuota de manejo, anualidad, mora, cajero, etc.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tipo de cobro financiero */}
        {transactionType === "expense" && isFinancialFee && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Tipo de cobro *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(
                [
                  { value: "maintenance", label: "Cuota manejo" },
                  { value: "annual_fee", label: "Anualidad" },
                  { value: "late_fee", label: "Mora" },
                  { value: "cash_advance_fee", label: "Avance" },
                  { value: "atm_fee", label: "Cajero" },
                  { value: "other_fee", label: "Otro" },
                ] as { value: FeeType; label: string }[]
              ).map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setFeeType(item.value)}
                  className={`px-4 py-2 rounded-full border ${
                    feeType === item.value
                      ? "bg-amber-500 border-amber-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={
                      feeType === item.value ? "text-black" : "text-gray-700"
                    }
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Categoría */}
        {!isFinancialFee && transactionType !== "transfer" && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Categoría *
            </Text>
            {filteredCategories.length === 0 ? (
              <Text className="text-gray-500 text-center">
                No hay categorías disponibles.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                {filteredCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    className={`mx-2 p-3 rounded-full items-center justify-center ${
                      selectedCategoryId === cat.id
                        ? "bg-blue-500"
                        : "bg-gray-200"
                    }`}
                    style={{ minWidth: 70 }}
                  >
                    <Text
                      className={`text-xl ${selectedCategoryId === cat.id ? "text-black" : "text-gray-700"}`}
                    >
                      {cat.iconImage || "📁"}
                    </Text>
                    <Text
                      className={`text-xs mt-1 ${selectedCategoryId === cat.id ? "text-black" : "text-gray-700"}`}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Cuotas */}
        {showInstallments && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Cuotas
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Totales</Text>
                <TextInput
                  className="px-4 py-3 border border-gray-300 rounded-lg"
                  keyboardType="numeric"
                  placeholder="Ej: 12"
                  value={installmentsTotal ? String(installmentsTotal) : ""}
                  onChangeText={(text) => {
                    const n = Number(text.replace(/\D/g, ""));
                    setInstallmentsTotal(n > 0 ? n : null);
                  }}
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Pagadas</Text>
                <TextInput
                  className="px-4 py-3 border border-gray-300 rounded-lg"
                  keyboardType="numeric"
                  placeholder="0"
                  value={
                    installmentsPaid !== null ? String(installmentsPaid) : "0"
                  }
                  onChangeText={(text) => {
                    const n = Number(text.replace(/\D/g, ""));
                    setInstallmentsPaid(n >= 0 ? n : 0);
                  }}
                />
              </View>
            </View>
            <Text className="text-xs text-gray-500 mt-2">
              Si no defines cuotas, se guardará como compra de una sola cuota.
            </Text>
          </View>
        )}

        {/* Fecha */}
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

        {/* Guardar */}
        <TouchableOpacity
          className={`${loading ? "opacity-50" : ""} bg-blue-600 py-4 rounded-lg items-center mb-4`}
          onPress={handleSave}
          disabled={loading}
        >
          <Text className="text-black font-medium text-base">
            {loading ? "Guardando..." : "Guardar transacción"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
