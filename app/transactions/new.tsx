import { database } from "@/database";
import { Transaction } from "@/database/models/mlTransaction"; // <-- 1. Importar el modelo
import {
  createTransactionRecord,
  updateTransactionRecord, // <-- 2. Importar la función de actualización
} from "@/services/transactionBalanceHelpers";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceCacheStore } from "@/store/useFinanceCacheStore";
import { useConfirmLeave } from "@/hooks/useConfirmLeave";
import { useDirtyState } from "@/hooks/useDirtyState";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
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
import PremiumIcon from "@/components/ui/PremiumIcon";

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  // 3. Detección del modo Edición
  const { id, accountId: presetAccountId } = useLocalSearchParams<{
    id?: string;
    accountId?: string;
  }>();
  const isEditing = !!id;

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
  const [calendarReady, setCalendarReady] = useState(false);

  const accounts = useFinanceCacheStore((s) => s.accounts);
  const categories = useFinanceCacheStore((s) => s.categories);
  const cacheLoading = useFinanceCacheStore((s) => s.loading);
  const loadFinanceCache = useFinanceCacheStore((s) => s.load);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [destinationAccountId, setDestinationAccountId] = useState<
    string | null
  >(null);

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

  const formatCOP = useCallback((text: string) => {
    const numeric = text.replace(/\D/g, "");
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }, []);

  const { isDirty, resetBaseline } = useDirtyState([
    transactionType,
    amountRaw,
    description,
    selectedAccountId,
    destinationAccountId,
    selectedCategoryId,
    transferTarget,
    installmentsTotal,
    installmentsPaid,
    isFinancialFee,
    feeType,
    selectedDate,
  ]);

  const resetForm = () => {
    setTransactionType(null);
    setAmountRaw("");
    setDescription("");
    setSelectedAccountId(null);
    setDestinationAccountId(null);
    setSelectedCategoryId(null);
    setTransferTarget("own");
    setInstallmentsTotal(null);
    setInstallmentsPaid(0);
    setIsFinancialFee(false);
    setFeeType(null);
    setSelectedDate(formatLocalDate(new Date()));
    resetBaseline();
  };

  const { allowLeave } = useConfirmLeave({
    enabled: isDirty,
    message: isEditing
      ? "Si sales ahora, los cambios de la transacción no se guardarán."
      : "Si sales ahora, la transacción no se guardará.",
    onDiscard: resetForm,
  });

  // 4. Cargar datos iniciales SI es edición
  useEffect(() => {
    const loadTransaction = async () => {
      if (isEditing && id) {
        try {
          const tx = await database.get<Transaction>("transactions").find(id);

          setTransactionType(tx.type as TxType);
          setAmountRaw(formatCOP(String(tx.amount)));
          setDescription(tx.description ?? "");
          setSelectedDate(formatLocalDate(new Date(tx.date)));

          setSelectedAccountId(tx.accountId ?? null);
          setDestinationAccountId(tx.destinationAccountId ?? null);
          setSelectedCategoryId(tx.categoryId ?? null);
          setTransferTarget((tx.transferTarget ?? "own") as TransferTarget);

          setInstallmentsTotal(tx.installmentsTotal ?? null);
          setInstallmentsPaid(tx.installmentsPaid ?? 0);

          setIsFinancialFee(!!tx.feeType);
          setFeeType((tx.feeType as FeeType) ?? null);
          setTimeout(() => resetBaseline(), 150);
        } catch (error) {
          console.error("Error cargando la transacción a editar:", error);
          Alert.alert("Error", "No se pudo cargar la transacción.");
          allowLeave();
          router.back();
        }
      }
    };
    loadTransaction();
  }, [id, isEditing, formatCOP, allowLeave, resetBaseline]);

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

    // La lógica que construiste aquí con `prev` es perfecta,
    // protege los datos cargados durante la edición.
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

  // Protegemos la selección si ya hay una cuenta asignada (por edición o por selección previa)
  useEffect(() => {
    if (accounts.length === 0) return;

    setSelectedAccountId((prev) => {
      if (prev && accounts.some((acc) => acc.id === prev)) {
        return prev;
      }
      if (presetAccountId && accounts.some((acc) => acc.id === presetAccountId)) {
        return presetAccountId;
      }
      return accounts[0].id;
    });
  }, [accounts, presetAccountId]);

  // Solo carga el caché una vez por usuario; luego se actualiza solo vía observe
  useEffect(() => {
    if (!userId) return;
    loadFinanceCache(userId);
    const t = setTimeout(() => resetBaseline(), 150);
    return () => clearTimeout(t);
  }, [userId, loadFinanceCache, resetBaseline]);

  // El calendario es pesado: lo montamos después del primer frame para que la
  // pantalla se vea interactiva de inmediato (los campos críticos se pintan antes).
  useEffect(() => {
    const t = setTimeout(() => setCalendarReady(true), 80);
    return () => clearTimeout(t);
  }, []);

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

  // ─── Guardar DUAL (Crear / Editar) ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    const numericAmount = Number(amountRaw.replace(/\./g, ""));
    const dateTimestamp = localDateStringToTimestamp(selectedDate);

    setLoading(true);

    try {
      if (isEditing && id) {
        // 5. Lógica de ACTUALIZACIÓN
        await updateTransactionRecord({
          transactionId: id,
          nextValues: {
            type: transactionType!,
            amount: numericAmount,
            description: description.trim(),
            date: dateTimestamp,
            accountId: selectedAccountId!,
            destinationAccountId:
              transactionType === "transfer" ? destinationAccountId : null,
            categoryId: isFinancialFee ? null : selectedCategoryId,
            transferTarget:
              transactionType === "transfer" ? transferTarget : null,
            installmentsTotal: showInstallments
              ? (installmentsTotal ?? 1)
              : null,
            installmentsPaid: showInstallments ? (installmentsPaid ?? 0) : null,
            feeType: isFinancialFee ? feeType! : null,
          },
        });
      } else {
        // 6. Lógica original de CREACIÓN
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
          transferTarget:
            transactionType === "transfer" ? transferTarget : null,
          installmentsTotal: showInstallments ? (installmentsTotal ?? 1) : null,
          installmentsPaid: showInstallments ? (installmentsPaid ?? 0) : null,
          feeType: isFinancialFee ? feeType! : null,
        });
      }

      resetForm();
      allowLeave();
      router.replace("/transactions/new");
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Error", error.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  // ─── UI ──────────────────────────────────────────────────────────────────────
  const accountsLoading = cacheLoading && accounts.length === 0;
  const categoriesLoading = cacheLoading && categories.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-deep dark:bg-deep-dark" edges={["bottom", "left", "right"]}>
      <ScreenBackdrop />
      <KeyboardAvoidingScrollView className="flex-1 px-5 mt-4">
        {/* Tipo */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-2">Tipo</Text>
          <View className="flex-row gap-3">
            {(["income", "expense", "transfer"] as TxType[]).map((type) => {
              const labels: Record<TxType, string> = {
                income: "Ingreso",
                expense: "Gasto",
                transfer: "Transferencia",
              };
              const activeColors: Record<TxType, string> = {
                income: "border-income dark:border-income-dark bg-income/10 dark:bg-income-dark/10",
                expense: "border-expense dark:border-expense-dark bg-expense/10 dark:bg-expense-dark/10",
                transfer: "border-accent dark:border-accent-dark bg-accent/10 dark:bg-accent-dark/10",
              };

              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setTransactionType(type)}
                  className={`flex-1 p-3 border-2 rounded-lg items-center ${
                    transactionType === type
                      ? activeColors[type]
                      : "border-black/10 dark:border-white/10"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      transactionType === type
                        ? type === "income"
                          ? "text-income dark:text-income-dark"
                          : type === "expense"
                            ? "text-expense dark:text-expense-dark"
                            : "text-accent dark:text-accent-dark"
                        : "text-muted dark:text-muted-dark"
                    }`}
                  >
                    {labels[type]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Monto */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-2">Monto *</Text>
          <View className="relative">
            <Text className="absolute left-3 top-3 text-muted dark:text-muted-dark text-lg">
              $
            </Text>
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

        {/* Cuenta origen */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-2">
            Cuenta origen *
          </Text>

          {accountsLoading ? (
            <View className="items-center py-6">
              <ActivityIndicator size="small" color="#4b9aff" />
            </View>
          ) : accounts.length === 0 ? (
            <Text className="text-muted dark:text-muted-dark text-center">
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
                        ? "bg-accent/10 dark:bg-accent-dark/10 border-accent dark:border-accent-dark "
                        : "bg-deepSoft dark:bg-deepSoft-dark border-black/10 dark:border-white/10"
                    }`}
                    style={{ minWidth: 150 }}
                  >
                    <PremiumIcon token={account.iconImage} size={32} fallback="🏦" />
                    <Text
                      numberOfLines={1}
                      className={`font-semibold ${isSelected ? "text-accent dark:text-accent-dark" : "text-ink dark:text-ink-dark"}`}
                    >
                      {account.name}
                    </Text>
                    <Text
                      className={`text-xs mt-1 ${isSelected ? "text-accent/80 dark:text-accent-dark/80" : "text-muted dark:text-muted-dark"}`}
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
            <Text className="text-sm font-medium text-muted dark:text-muted-dark mb-2">
              Destino
            </Text>

            <View className="flex-row gap-3 mb-3">
              {(["own", "person"] as TransferTarget[]).map((target) => (
                <TouchableOpacity
                  key={target}
                  onPress={() => setTransferTarget(target)}
                  className={`flex-1 p-3 border rounded-lg items-center ${
                    transferTarget === target
                      ? "border-accent bg-accent/10"
                      : "border-black/10 dark:border-white/10"
                  }`}
                >
                  <Text className="text-ink dark:text-ink-dark border-black/10 dark:border-white/10">
                    {target === "own" ? "Mis cuentas" : "Otra persona"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {transferTarget === "own" && (
              <>
                <Text className="text-sm font-medium text-muted dark:text-muted-dark mb-2">
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
                              ? "bg-accent/10 dark:bg-accent-dark/10 border-accent dark:border-accent-dark"
                              : "bg-deepSoft dark:bg-deepSoft-dark border-black/10 dark:border-white/10"
                          }`}
                          style={{ minWidth: 150 }}
                        >
                          <PremiumIcon token={account.iconImage} size={32} fallback="🏦" />
                          <Text
                            numberOfLines={1}
                            className={`font-semibold ${isSelected ? "text-accent dark:text-accent-dark" : "text-ink dark:text-ink-dark"}`}
                          >
                            {account.name}
                          </Text>
                          <Text
                            className={`text-xs mt-1 ${isSelected ? "text-accent/80 dark:text-accent-dark/80" : "text-muted dark:text-muted-dark"}`}
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
                  ? "border-accent dark:border-accent-dark bg-accent/15 dark:bg-accent-dark/15"
                  : "border-black/10 dark:border-white/10"
              }`}
            >
              <Text className="font-medium text-ink dark:text-ink-dark">Es un cobro financiero</Text>
              <Text className="text-xs text-muted dark:text-muted-dark mt-1">
                Úsalo para cuota de manejo, anualidad, mora, cajero, etc.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tipo de cobro financiero */}
        {transactionType === "expense" && isFinancialFee && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-muted dark:text-muted-dark mb-2">
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
                      ? "bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark"
                      : "bg-deepSoft dark:bg-deepSoft-dark border-black/10 dark:border-white/10"
                  }`}
                >
                  <Text
                    className={
                      feeType === item.value ? "text-accent dark:text-accent-dark" : "text-muted dark:text-muted-dark"
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
            <Text className="text-sm font-medium text-muted dark:text-muted-dark mb-2">
              Categoría *
            </Text>
            {categoriesLoading ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" color="#4b9aff" />
              </View>
            ) : filteredCategories.length === 0 ? (
              <Text className="text-muted dark:text-muted-dark text-center">
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
                        ? "bg-accent dark:bg-accent-dark"
                        : "bg-black/10 dark:bg-white/10"
                    }`}
                    style={{ minWidth: 70 }}
                  >
                    <PremiumIcon token={cat.iconImage} size={28} fallback="📁" />
                    <Text
                      className={`text-xs mt-1 ${selectedCategoryId === cat.id ? "text-white" : "text-muted dark:text-muted-dark"}`}
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
            <Text className="text-sm font-medium text-muted dark:text-muted-dark mb-2">
              Cuotas
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-muted dark:text-muted-dark mb-1">Totales</Text>
                <TextInput
                  className="px-4 py-3 border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark rounded-lg text-ink dark:text-ink-dark"
                  keyboardType="numeric"
                  placeholder="Ej: 12"
                  placeholderTextColor="#9ca3af"
                  value={installmentsTotal ? String(installmentsTotal) : ""}
                  onChangeText={(text) => {
                    const n = Number(text.replace(/\D/g, ""));
                    setInstallmentsTotal(n > 0 ? n : null);
                  }}
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted dark:text-muted-dark mb-1">Pagadas</Text>
                <TextInput
                  className="px-4 py-3 border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark rounded-lg text-ink dark:text-ink-dark"
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
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
            <Text className="text-xs text-muted dark:text-muted-dark mt-2">
              Si no defines cuotas, se guardará como compra de una sola cuota.
            </Text>
          </View>
        )}

        {/* Fecha */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-muted dark:text-muted-dark mb-2">Fecha</Text>
          {calendarReady ? (
          <Calendar
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            maxDate={todayString}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: "#4b9aff" },
            }}
            current={selectedDate}
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
          ) : (
            <TouchableOpacity
              onPress={() => setCalendarReady(true)}
              className="flex-row items-center justify-between border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark rounded-lg p-4"
            >
              <Text className="text-ink dark:text-ink-dark font-medium">
                📅 {selectedDate}
              </Text>
              <Text className="text-muted dark:text-muted-dark text-sm">
                Seleccionar fecha
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Comentarios */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-muted dark:text-muted-dark mb-2">
            Comentarios
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

        {/* Guardar */}
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
                : "Guardar transacción"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingScrollView>
    </SafeAreaView>
  );
}
