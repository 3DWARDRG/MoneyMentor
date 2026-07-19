import { database } from "@/database";
import { Account } from "@/database/models/mlAccount";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCOUNT_TYPES = [
  { label: "Efectivo", value: "cash", icon: "💵" },
  { label: "Ahorros", value: "savings", icon: "🏦" },
  { label: "Corriente", value: "checking", icon: "💳" },
  { label: "Crédito", value: "credit", icon: "🪙" },
] as const;

const CREDIT_SUBTYPES = [
  { label: "Tarjeta de crédito", value: "credit_card", icon: "💳" },
  { label: "Libre inversión", value: "personal_loan", icon: "💸" },
  { label: "Hipotecario", value: "mortgage", icon: "🏠" },
  { label: "Línea de crédito", value: "credit_line", icon: "🏦" },
] as const;

const CURRENCIES = ["COP", "USD", "EUR"] as const;

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("COP");
  const [type, setType] =
    useState<(typeof ACCOUNT_TYPES)[number]["value"]>("savings");
  const [creditSubtype, setCreditSubtype] = useState<
    (typeof CREDIT_SUBTYPES)[number]["value"] | null
  >(null);
  const [iconImage, setIconImage] = useState("🏦");
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

  const parsedBalance = useMemo(() => {
    const normalized = balance.replace(",", ".").trim();
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

  const clearCreditCardFields = () => {
    setCreditLimit("");
    setStatementClosingDay("");
    setPaymentDueDay("");
    setAprAnnual("");
    setAprMonthly("");
    setCardLast4("");
  };

  useEffect(() => {
    const loadAccount = async () => {
      if (!id || Array.isArray(id)) {
        setLoading(false);
        return;
      }

      try {
        const record = await database.get<Account>("accounts").find(id);

        setAccount(record);
        setName(record.name ?? "");
        setInstitution(record.institution ?? "");
        setBalance(String(record.balance ?? 0));
        setCurrency((record.currency as (typeof CURRENCIES)[number]) ?? "COP");
        setType(
          (record.type as (typeof ACCOUNT_TYPES)[number]["value"]) ?? "savings",
        );
        setCreditSubtype(
          (record.creditSubtype as
            | (typeof CREDIT_SUBTYPES)[number]["value"]
            | null) ?? null,
        );
        setIconImage(record.iconImage ?? "🏦");
        setIsActive(record.isActive !== false);

        setCreditLimit(
          record.creditLimit !== null && record.creditLimit !== undefined
            ? String(record.creditLimit)
            : "",
        );
        setStatementClosingDay(
          record.statementClosingDay !== null &&
            record.statementClosingDay !== undefined
            ? String(record.statementClosingDay)
            : "",
        );
        setPaymentDueDay(
          record.paymentDueDay !== null && record.paymentDueDay !== undefined
            ? String(record.paymentDueDay)
            : "",
        );
        setAprAnnual(
          record.aprAnnual !== null && record.aprAnnual !== undefined
            ? String(record.aprAnnual)
            : "",
        );
        setAprMonthly(
          record.aprMonthly !== null && record.aprMonthly !== undefined
            ? String(record.aprMonthly)
            : "",
        );
        setCardLast4(record.cardLast4 ?? "");
      } catch (error) {
        console.error("❌ Error cargando cuenta:", error);
        Alert.alert("Error", "No se pudo cargar la cuenta.");
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, [id]);

  const handleSave = async () => {
    if (!account) return;

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
        "Selecciona qué tipo de crédito deseas configurar.",
      );
      return;
    }

    if (isCreditCard) {
      if (creditLimit.trim() && parsedCreditLimit === null) {
        Alert.alert("Límite inválido", "Ingresa un límite de crédito válido.");
        return;
      }

      if (
        parsedStatementClosingDay !== null &&
        (parsedStatementClosingDay < 1 || parsedStatementClosingDay > 31)
      ) {
        Alert.alert("Día de corte inválido", "Debe estar entre 1 y 31.");
        return;
      }

      if (
        parsedPaymentDueDay !== null &&
        (parsedPaymentDueDay < 1 || parsedPaymentDueDay > 31)
      ) {
        Alert.alert("Día de pago inválido", "Debe estar entre 1 y 31.");
        return;
      }

      if (aprAnnual.trim() && parsedAprAnnual === null) {
        Alert.alert("Tasa anual inválida", "Ingresa una tasa anual válida.");
        return;
      }

      if (aprMonthly.trim() && parsedAprMonthly === null) {
        Alert.alert(
          "Tasa mensual inválida",
          "Ingresa una tasa mensual válida.",
        );
        return;
      }

      if (cardLast4.trim() && !/^\d{4}$/.test(cardLast4.trim())) {
        Alert.alert(
          "Tarjeta inválida",
          "Los últimos 4 dígitos deben contener exactamente 4 números.",
        );
        return;
      }
    }

    setSaving(true);

    try {
      await database.write(async () => {
        await account.update((record) => {
          record.name = name.trim();
          record.institution = institution.trim() || null;
          record.balance = parsedBalance;
          record.currency = currency;
          record.type = type;
          record.creditSubtype = isCreditType ? creditSubtype : null;
          record.iconImage = iconImage || selectedType?.icon || "🏦";
          record.isActive = isActive;

          record.creditLimit = isCreditCard ? parsedCreditLimit : null;
          record.interestRate = null;
          record.paymentDueDay = isCreditCard ? parsedPaymentDueDay : null;
          record.statementClosingDay = isCreditCard
            ? parsedStatementClosingDay
            : null;
          record.aprAnnual = isCreditCard ? parsedAprAnnual : null;
          record.aprMonthly = isCreditCard ? parsedAprMonthly : null;
          record.cardLast4 =
            isCreditCard && cardLast4.trim() ? cardLast4.trim() : null;
        });
      });

      router.back();
    } catch (error) {
      console.error("❌ Error actualizando cuenta:", error);
      Alert.alert("Error", "No se pudo guardar la cuenta.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f5f5f5]">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f5f5f5] px-6">
        <Text className="text-center text-base text-[#666]">
          No se encontró la cuenta.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-[#6C63FF] px-4 py-3"
        >
          <Text className="font-semibold text-black">Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f5f5f5]">
      <View className="flex-row items-center justify-between border-b border-black/5 bg-white px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>

        <Text className="flex-1 text-center text-lg font-semibold text-[#111]">
          Editar cuenta
        </Text>

        <View className="w-6" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl bg-white p-4">
          <Text className="mb-2 text-sm font-medium text-[#444]">
            Nombre de la cuenta
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Bancolombia Ahorros"
            className="mb-4 rounded-xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-base text-[#111]"
            placeholderTextColor="#999"
          />

          <Text className="mb-2 text-sm font-medium text-[#444]">
            Institución
          </Text>
          <TextInput
            value={institution}
            onChangeText={setInstitution}
            placeholder="Ej: Bancolombia"
            className="mb-4 rounded-xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-base text-[#111]"
            placeholderTextColor="#999"
          />

          <Text className="mb-2 text-sm font-medium text-[#444]">
            Saldo actual
          </Text>
          <TextInput
            value={balance}
            onChangeText={setBalance}
            placeholder="0"
            keyboardType="decimal-pad"
            className="mb-4 rounded-xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-base text-[#111]"
            placeholderTextColor="#999"
          />

          <Text className="mb-2 text-sm font-medium text-[#444]">Moneda</Text>
          <View className="mb-4 flex-row gap-2">
            {CURRENCIES.map((item) => {
              const active = currency === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCurrency(item)}
                  className={`rounded-full px-4 py-2 ${
                    active ? "bg-[#6C63FF]" : "bg-[#ecebff]"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      active ? "text-black" : "text-[#4b45b8]"
                    }`}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-2 text-sm font-medium text-[#444]">
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
                      clearCreditCardFields();
                    }
                  }}
                  className={`min-w-[45%] rounded-2xl border px-4 py-3 ${
                    active
                      ? "border-[#6C63FF] bg-[#ecebff]"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className="mb-1 text-lg">{item.icon}</Text>
                  <Text
                    className={`font-semibold ${
                      active ? "text-[#4b45b8]" : "text-[#222]"
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
              <Text className="mb-2 text-sm font-medium text-[#444]">
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
                          clearCreditCardFields();
                        }
                      }}
                      className={`min-w-[45%] rounded-2xl border px-4 py-3 ${
                        active
                          ? "border-[#6C63FF] bg-[#ecebff]"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <Text className="mb-1 text-lg">{item.icon}</Text>
                      <Text
                        className={`font-semibold ${
                          active ? "text-[#4b45b8]" : "text-[#222]"
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

          <Text className="mb-2 text-sm font-medium text-[#444]">Ícono</Text>
          <TextInput
            value={iconImage}
            onChangeText={setIconImage}
            placeholder="🏦"
            className="mb-4 rounded-xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-base text-[#111]"
            placeholderTextColor="#999"
          />

          {isCreditCard && (
            <View className="mb-4 rounded-2xl bg-[#fafafa] p-4">
              <Text className="mb-4 text-base font-semibold text-[#222]">
                Configuración de tarjeta
              </Text>

              <Text className="mb-2 text-sm font-medium text-[#444]">
                Límite de crédito
              </Text>
              <TextInput
                value={creditLimit}
                onChangeText={setCreditLimit}
                placeholder="Ej: 5000000"
                keyboardType="numeric"
                className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-[#111]"
                placeholderTextColor="#999"
              />

              <View className="mb-4 flex-row gap-4">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-[#444]">
                    Día de corte
                  </Text>
                  <TextInput
                    value={statementClosingDay}
                    onChangeText={setStatementClosingDay}
                    placeholder="1-31"
                    keyboardType="numeric"
                    maxLength={2}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-[#111]"
                    placeholderTextColor="#999"
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-[#444]">
                    Día límite de pago
                  </Text>
                  <TextInput
                    value={paymentDueDay}
                    onChangeText={setPaymentDueDay}
                    placeholder="1-31"
                    keyboardType="numeric"
                    maxLength={2}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-[#111]"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View className="mb-4 flex-row gap-4">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-[#444]">
                    Tasa anual (%)
                  </Text>
                  <TextInput
                    value={aprAnnual}
                    onChangeText={setAprAnnual}
                    placeholder="Ej: 28.5"
                    keyboardType="decimal-pad"
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-[#111]"
                    placeholderTextColor="#999"
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-[#444]">
                    Tasa mensual (%)
                  </Text>
                  <TextInput
                    value={aprMonthly}
                    onChangeText={setAprMonthly}
                    placeholder="Ej: 2.2"
                    keyboardType="decimal-pad"
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-[#111]"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <Text className="mb-2 text-sm font-medium text-[#444]">
                Últimos 4 dígitos
              </Text>
              <TextInput
                value={cardLast4}
                onChangeText={setCardLast4}
                placeholder="1234"
                keyboardType="numeric"
                maxLength={4}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-[#111]"
                placeholderTextColor="#999"
              />
            </View>
          )}

          <Text className="mb-2 text-sm font-medium text-[#444]">Estado</Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setIsActive(true)}
              className={`rounded-full px-4 py-2 ${
                isActive ? "bg-[#16a34a]" : "bg-gray-200"
              }`}
            >
              <Text className={`${isActive ? "text-black" : "text-[#444]"}`}>
                Activa
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setIsActive(false)}
              className={`rounded-full px-4 py-2 ${
                !isActive ? "bg-[#dc2626]" : "bg-gray-200"
              }`}
            >
              <Text className={`${!isActive ? "text-black" : "text-[#444]"}`}>
                Inactiva
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className={`mt-6 items-center justify-center rounded-2xl py-4 ${
            saving ? "bg-[#b7b4ff]" : "bg-[#6C63FF]"
          }`}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-black">
              Guardar cambios
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
