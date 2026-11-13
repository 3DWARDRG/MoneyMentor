import { Account } from "@/database/models/mlAccount"; // 1. Agregado el modelo
import { useConfirmLeave } from "@/hooks/useConfirmLeave";
import { useDirtyState } from "@/hooks/useDirtyState";
import {
  createAccount,
  getAccountById,
  updateAccount,
} from "@/services/accountService";
import { useAuthStore } from "@/store/useAuthStore";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import KeyboardAvoidingScrollView from "@/components/KeyboardAvoidingScrollView";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";
import PremiumIcon from "@/components/ui/PremiumIcon";
import { PREMIUM_ICONS } from "@/constants/premiumIcons";

const ACCOUNT_TYPES = [
  { label: "Efectivo", value: "cash", icon: "cash" },
  { label: "Ahorros", value: "savings", icon: "savings" },
  { label: "Corriente", value: "checking", icon: "checking" },
  { label: "Crédito", value: "credit", icon: "credit_card" },
] as const;

const CREDIT_SUBTYPES = [
  { label: "Tarjeta de crédito", value: "credit_card", icon: "credit_card" },
  { label: "Libre inversión", value: "personal_loan", icon: "loan" },
  { label: "Hipotecario", value: "mortgage", icon: "mortgage" },
  { label: "Línea de crédito", value: "credit_line", icon: "credit_line" },
] as const;

const ACCOUNT_ICON_CHOICES = PREMIUM_ICONS.filter(
  (def) => def.type === "account" || def.type === "any",
);

const CURRENCIES = ["COP", "USD", "EUR"] as const;

export default function NewAccountScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? "Editar cuenta" : "Nueva cuenta",
    });
  }, [navigation, isEditing]);

  const userId = useAuthStore((s) => s.userId);

  // 2. Estado para guardar la cuenta si estamos editando
  const [account, setAccount] = useState<Account | null>(null);

  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("COP");
  const [type, setType] =
    useState<(typeof ACCOUNT_TYPES)[number]["value"]>("savings");
  const [creditSubtype, setCreditSubtype] = useState<
    (typeof CREDIT_SUBTYPES)[number]["value"] | null
  >(null);
  const [iconImage, setIconImage] = useState("savings");
  const [loading, setLoading] = useState(isEditing); // Si edita, arranca cargando

  // Agregamos estado de activo por si luego quieres desactivarla en edición
  const [isActive, setIsActive] = useState(true);

  const [creditLimit, setCreditLimit] = useState("");
  const [statementClosingDay, setStatementClosingDay] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [aprAnnual, setAprAnnual] = useState("");
  const [aprMonthly, setAprMonthly] = useState("");
  const [cardLast4, setCardLast4] = useState("");

  const selectedType = useMemo(
    () => ACCOUNT_TYPES.find((item) => item.value === type),
    [type],
  );

  const formatCOP = (text: string) => {
    const numeric = text.replace(/\D/g, "");
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parsedBalance = useMemo(() => {
    const normalized = balance.replace(/\./g, "").replace(",", ".").trim();
    if (!normalized) return 0;
    const value = Number(normalized);
    return Number.isNaN(value) ? null : value;
  }, [balance]);

  const parsedCreditLimit = useMemo(() => {
    const normalized = creditLimit.replace(",", ".").trim();
    if (!normalized) return null;
    const value = Number(normalized);
    return Number.isNaN(value) ? null : value;
  }, [creditLimit]);

  const parsedStatementClosingDay = useMemo(() => {
    const normalized = statementClosingDay.trim();
    if (!normalized) return null;
    const value = Number(normalized);
    return Number.isNaN(value) ? null : value;
  }, [statementClosingDay]);

  const parsedPaymentDueDay = useMemo(() => {
    const normalized = paymentDueDay.trim();
    if (!normalized) return null;
    const value = Number(normalized);
    return Number.isNaN(value) ? null : value;
  }, [paymentDueDay]);

  const parsedAprAnnual = useMemo(() => {
    const normalized = aprAnnual.replace(",", ".").trim();
    if (!normalized) return null;
    const value = Number(normalized);
    return Number.isNaN(value) ? null : value;
  }, [aprAnnual]);

  const parsedAprMonthly = useMemo(() => {
    const normalized = aprMonthly.replace(",", ".").trim();
    if (!normalized) return null;
    const value = Number(normalized);
    return Number.isNaN(value) ? null : value;
  }, [aprMonthly]);

  const isCreditType = type === "credit";
  const isCreditCard = type === "credit" && creditSubtype === "credit_card";

  const clearCreditFields = useCallback(() => {
    setCreditLimit("");
    setStatementClosingDay("");
    setPaymentDueDay("");
    setAprAnnual("");
    setAprMonthly("");
    setCardLast4("");
  }, []);

  const resetForm = useCallback(() => {
    setName("");
    setInstitution("");
    setBalance("");
    setCurrency("COP");
    setType("savings");
    setCreditSubtype(null);
    setIconImage("savings");
    clearCreditFields();
    setLoading(false);
  }, [clearCreditFields]);

  const { isDirty, resetBaseline } = useDirtyState([
    name,
    institution,
    balance,
    currency,
    type,
    creditSubtype,
    iconImage,
    isActive,
    creditLimit,
    statementClosingDay,
    paymentDueDay,
    aprAnnual,
    aprMonthly,
    cardLast4,
  ]);

  const { allowLeave } = useConfirmLeave({
    enabled: isDirty,
    message: isEditing
      ? "Si sales ahora, los cambios de la cuenta no se guardarán."
      : "Si sales ahora, la cuenta nueva no se guardará.",
    onDiscard: resetForm,
  });

  // 5. PROTECCIÓN DE REINICIO: Solo limpia el form si NO estamos editando
  useFocusEffect(
    useCallback(() => {
      if (!isEditing) {
        resetForm();
        resetBaseline();
      }
    }, [isEditing, resetForm, resetBaseline]),
  );

  // 3. EFECTO DE CARGA: Busca los datos si es modo Edición
  useEffect(() => {
    const loadAccount = async () => {
      if (isEditing && id) {
        try {
          const record = await getAccountById(id);
          if (!record) throw new Error("Cuenta no encontrada");
          setAccount(record);

          setName(record.name ?? "");
          setInstitution(record.institution ?? "");
          setBalance(String(record.balance ?? 0));
          setCurrency(
            (record.currency as (typeof CURRENCIES)[number]) ?? "COP",
          );
          setType(
            (record.type as (typeof ACCOUNT_TYPES)[number]["value"]) ??
              "savings",
          );
          setCreditSubtype(
            (record.creditSubtype as
              | (typeof CREDIT_SUBTYPES)[number]["value"]
              | null) ?? null,
          );
          setIconImage(record.iconImage ?? "savings");
          setIsActive(record.isActive !== false);

          setCreditLimit(
            record.creditLimit != null ? String(record.creditLimit) : "",
          );
          setStatementClosingDay(
            record.statementClosingDay != null
              ? String(record.statementClosingDay)
              : "",
          );
          setPaymentDueDay(
            record.paymentDueDay != null ? String(record.paymentDueDay) : "",
          );
          setAprAnnual(
            record.aprAnnual != null ? String(record.aprAnnual) : "",
          );
          setAprMonthly(
            record.aprMonthly != null ? String(record.aprMonthly) : "",
          );
          setCardLast4(record.cardLast4 ?? "");
          resetBaseline();
        } catch (error) {
          Alert.alert("Error", "No se pudo cargar la cuenta");
          allowLeave();
          router.back();
        } finally {
          setLoading(false);
        }
      }
    };
    loadAccount();
  }, [id, isEditing, allowLeave, resetBaseline]);

  // 4. LÓGICA DE GUARDADO DUAL
  const handleSave = async () => {
    if (!userId && !isEditing) {
      Alert.alert("Sesión inválida", "No se encontró un usuario activo.");
      return;
    }

    if (!name.trim()) {
      Alert.alert(
        "Campo requerido",
        "Debes ingresar un nombre para la cuenta.",
      );
      return;
    }

    if (parsedBalance === null) {
      Alert.alert("Saldo inválido", "Ingresa un valor numérico válido.");
      return;
    }

    if (isCreditType && !creditSubtype) {
      Alert.alert(
        "Subtipo requerido",
        "Selecciona qué tipo de crédito deseas crear.",
      );
      return;
    }

    if (isCreditCard) {
      if (creditLimit.trim() && parsedCreditLimit === null)
        return Alert.alert(
          "Límite inválido",
          "Ingresa un límite de crédito válido.",
        );
      if (
        parsedStatementClosingDay !== null &&
        (parsedStatementClosingDay < 1 || parsedStatementClosingDay > 31)
      )
        return Alert.alert("Día de corte inválido", "Debe estar entre 1 y 31.");
      if (
        parsedPaymentDueDay !== null &&
        (parsedPaymentDueDay < 1 || parsedPaymentDueDay > 31)
      )
        return Alert.alert("Día de pago inválido", "Debe estar entre 1 y 31.");
      if (aprAnnual.trim() && parsedAprAnnual === null)
        return Alert.alert(
          "Tasa anual inválida",
          "Ingresa una tasa anual válida.",
        );
      if (aprMonthly.trim() && parsedAprMonthly === null)
        return Alert.alert(
          "Tasa mensual inválida",
          "Ingresa una tasa mensual válida.",
        );
      if (cardLast4.trim() && !/^\d{4}$/.test(cardLast4.trim()))
        return Alert.alert(
          "Tarjeta inválida",
          "Los últimos 4 dígitos deben contener exactamente 4 números.",
        );
    }

    setLoading(true);

    try {
      const data = {
        name: name.trim(),
        iconImage: iconImage || selectedType?.icon || "savings",
        balance: parsedBalance,
        type,
        creditSubtype: isCreditType ? creditSubtype : null,
        institution: institution.trim() || null,
        currency,
        isActive,
        creditLimit: isCreditCard ? parsedCreditLimit : null,
        interestRate: null,
        paymentDueDay: isCreditCard ? parsedPaymentDueDay : null,
        statementClosingDay: isCreditCard ? parsedStatementClosingDay : null,
        aprAnnual: isCreditCard ? parsedAprAnnual : null,
        aprMonthly: isCreditCard ? parsedAprMonthly : null,
        cardLast4: isCreditCard && cardLast4.trim() ? cardLast4.trim() : null,
      };

      if (isEditing && account) {
        await updateAccount(account.id, data);
      } else {
        await createAccount({ userId: userId!, ...data });
      }

      allowLeave();
      router.back();
    } catch (error) {
      console.error("❌ Error guardando cuenta:", error);
      Alert.alert(
        "Error",
        `No se pudo ${isEditing ? "actualizar" : "crear"} la cuenta.`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Muestra spinner completo si está cargando datos de edición
  if (isEditing && !account && loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-deep dark:bg-deep-dark">
        <ScreenBackdrop />
        <ActivityIndicator size="large" color="#4b9aff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-deep dark:bg-deep-dark">
      <ScreenBackdrop />
      <KeyboardAvoidingScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10 p-4">
          <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
            Nombre de la cuenta
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Bancolombia Ahorros"
            className="mb-4 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
            placeholderTextColor="#9ca3af"
          />

          <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
            Institución
          </Text>
          <TextInput
            value={institution}
            onChangeText={setInstitution}
            placeholder="Ej: Bancolombia"
            className="mb-4 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
            placeholderTextColor="#9ca3af"
          />

          <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
            {isEditing ? "Saldo actual" : "Saldo inicial"}
          </Text>
          <TextInput
            value={balance}
            onChangeText={(balance) =>
              currency === "COP"
                ? setBalance(formatCOP(balance))
                : setBalance(balance)
            }
            placeholder="0"
            keyboardType="decimal-pad"
            className="mb-4 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
            placeholderTextColor="#9ca3af"
          />

          <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">Moneda</Text>
          <View className="mb-4 flex-row gap-2">
            {CURRENCIES.map((item) => {
              const active = currency === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCurrency(item)}
                  className={`rounded-full px-4 py-2 ${
                    active ? "bg-accent dark:bg-accent-dark" : "bg-accent/10 dark:bg-accent-dark/10"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      active ? "text-white" : "text-accent dark:text-accent-dark"
                    }`}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
            Tipo de cuenta
          </Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {ACCOUNT_TYPES.map((item) => {
              const active = type === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    setType(item.value);
                    setIconImage(item.icon);

                    if (item.value !== "credit") {
                      setCreditSubtype(null);
                      clearCreditFields();
                    }
                  }}
                  className={`min-w-[45%] rounded-2xl border px-4 py-3 ${
                    active
                      ? "border-accent dark:border-accent-dark bg-accent/10 dark:bg-accent-dark/10"
                      : "border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark"
                  }`}
                >
                  <View className="mb-1">
                    <PremiumIcon token={item.icon} size={32} fallback="💵" />
                  </View>
                  <Text
                    className={`font-semibold ${
                      active ? "text-accent dark:text-accent-dark" : "text-ink dark:text-ink-dark"
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isCreditType && (
            <>
              <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
                Tipo de crédito
              </Text>
              <View className="mb-4 flex-row flex-wrap gap-2">
                {CREDIT_SUBTYPES.map((item) => {
                  const active = creditSubtype === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => {
                        setCreditSubtype(item.value);

                        if (item.value !== "credit_card") {
                          clearCreditFields();
                        }
                      }}
                      className={`min-w-[45%] rounded-2xl border px-4 py-3 ${
                        active
                          ? "border-accent dark:border-accent-dark bg-accent/10 dark:bg-accent-dark/10"
                          : "border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark"
                      }`}
                    >
                      <View className="mb-1">
                        <PremiumIcon token={item.icon} size={32} fallback="💳" />
                      </View>
                      <Text
                        className={`font-semibold ${
                          active ? "text-accent dark:text-accent-dark" : "text-ink dark:text-ink-dark"
                        }`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">Ícono</Text>
          <View className="mb-2 flex-row flex-wrap gap-2">
            {ACCOUNT_ICON_CHOICES.map((def) => {
              const active = iconImage === def.key;
              return (
                <Pressable
                  key={def.key}
                  onPress={() => setIconImage(def.key)}
                  className={`rounded-2xl border p-2 ${
                    active
                      ? "border-accent dark:border-accent-dark bg-accent/10 dark:bg-accent-dark/10"
                      : "border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark"
                  }`}
                >
                  <PremiumIcon token={def.key} size={36} radius={10} />
                </Pressable>
              );
            })}
          </View>

          {isCreditCard && (
            <View className="mt-4 rounded-2xl bg-panel dark:bg-panel-dark border border-black/10 dark:border-white/10 p-4">
              <Text className="mb-4 text-base font-semibold text-ink dark:text-ink-dark">
                Configuración de tarjeta
              </Text>

              <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
                Límite de crédito
              </Text>
              <TextInput
                value={creditLimit}
                onChangeText={setCreditLimit}
                placeholder="Ej: 5000000"
                keyboardType="numeric"
                className="mb-4 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
                placeholderTextColor="#9ca3af"
              />

              <View className="mb-4 flex-row gap-4">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
                    Día de corte
                  </Text>
                  <TextInput
                    value={statementClosingDay}
                    onChangeText={setStatementClosingDay}
                    placeholder="1-31"
                    keyboardType="numeric"
                    maxLength={2}
                    className="rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
                    Día límite de pago
                  </Text>
                  <TextInput
                    value={paymentDueDay}
                    onChangeText={setPaymentDueDay}
                    placeholder="1-31"
                    keyboardType="numeric"
                    maxLength={2}
                    className="rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View className="mb-4 flex-row gap-4">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
                    Tasa anual (%)
                  </Text>
                  <TextInput
                    value={aprAnnual}
                    onChangeText={setAprAnnual}
                    placeholder="Ej: 28.5"
                    keyboardType="decimal-pad"
                    className="rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
                    Tasa mensual (%)
                  </Text>
                  <TextInput
                    value={aprMonthly}
                    onChangeText={setAprMonthly}
                    placeholder="Ej: 2.2"
                    keyboardType="decimal-pad"
                    className="rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
                Últimos 4 dígitos
              </Text>
              <TextInput
                value={cardLast4}
                onChangeText={setCardLast4}
                placeholder="1234"
                keyboardType="numeric"
                maxLength={4}
                className="rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 text-base text-ink dark:text-ink-dark"
                placeholderTextColor="#9ca3af"
              />
            </View>
          )}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={loading}
          className={`mt-6 items-center justify-center rounded-2xl py-4 ${
            loading
              ? "bg-accent/40 dark:bg-accent-dark/40"
              : "bg-accent dark:bg-accent-dark"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {isEditing ? "Guardar cambios" : "Crear cuenta"}
            </Text>
          )}
        </Pressable>
      </KeyboardAvoidingScrollView>
    </SafeAreaView>
  );
}
