import { database } from "@/database";
import { Account } from "@/database/models/mlAccount";
import { Transaction } from "@/database/models/mlTransaction";
import {
  deleteTransactionRecord,
  updateTransactionRecord,
} from "@/services/transactionBalanceHelpers";
import { Q } from "@nozbe/watermelondb";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TxType = "income" | "expense" | "transfer";
type TransferTarget = "own" | "person" | "bank";
type FeeType =
  | "maintenance"
  | "annual_fee"
  | "late_fee"
  | "cash_advance_fee"
  | "atm_fee"
  | "other_fee"
  | null;

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [transaction, setTransaction] = useState<any | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [transactionType, setTransactionType] = useState<TxType | null>(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [description, setDescription] = useState("");
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
  const [feeType, setFeeType] = useState<FeeType>(null);

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

  const formatCOP = (text: string) => {
    const numeric = text.replace(/\D/g, "");
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        if (!id) return;

        try {
          setLoading(true);

          const txCollection = database.get<Transaction>("transactions");
          const accCollection = database.get<Account>("accounts");
          const catCollection = database.get("categories");

          const tx = await txCollection.find(id);

          const [dbAccounts, dbCategories] = await Promise.all([
            accCollection.query(Q.where("user_id", tx.userId)).fetch(),
            catCollection.query(Q.where("user_id", tx.userId)).fetch(),
          ]);

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

          const formattedCategories = dbCategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            iconImage: cat.iconImage,
            type: cat.type,
          }));

          setTransaction(tx);
          setAccounts(formattedAccounts);
          setCategories(formattedCategories);

          setSelectedDate(formatLocalDate(new Date(tx.date)));
          setTransactionType(tx.type);
          setAmountRaw(formatCOP(String(tx.amount ?? "")));
          setDescription(tx.description ?? "");
          setSelectedAccountId(tx.accountId ?? null);
          setDestinationAccountId(tx.destinationAccountId ?? null);
          setSelectedCategoryId(tx.categoryId ?? null);
          setTransferTarget((tx.transferTarget ?? "own") as TransferTarget);
          setInstallmentsTotal(tx.installmentsTotal ?? null);
          setInstallmentsPaid(tx.installmentsPaid ?? 0);
          setFeeType(tx.feeType ?? null);
        } catch (error) {
          console.error("Error cargando transacción:", error);
          Alert.alert("Error", "No se pudo cargar la transacción");
          router.back();
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, [id]),
  );

  const selectedAccount = useMemo(
    () => accounts.find((acc) => acc.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  const isFinancialFee = !!feeType;

  const isSelectedCreditCard =
    selectedAccount?.type === "credit" &&
    selectedAccount?.creditSubtype === "credit_card";

  const showInstallments =
    transactionType === "expense" && isSelectedCreditCard && !isFinancialFee;

  const filteredCategories = categories.filter(
    (cat) => !transactionType || cat.type === transactionType,
  );

  const handleDelete = async () => {
    if (!transaction?.id) return;

    Alert.alert("Eliminar transacción", "Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransactionRecord(transaction.id);
            router.back();
          } catch (error: any) {
            Alert.alert("Error", error.message || "No se pudo eliminar");
          }
        },
      },
    ]);
  };

  const handleUpdate = async () => {
    if (!transaction?.id || !transactionType || !selectedAccountId) {
      Alert.alert("Error", "Faltan datos requeridos");
      return;
    }

    const numericAmount = Number(amountRaw.replace(/\./g, ""));
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert("Error", "Ingresa un monto válido");
      return;
    }

    if (transactionType === "transfer") {
      if (!destinationAccountId) {
        Alert.alert("Error", "Selecciona una cuenta destino");
        return;
      }

      if (destinationAccountId === selectedAccountId) {
        Alert.alert("Error", "La cuenta destino debe ser distinta");
        return;
      }
    }

    if (transactionType !== "transfer" && !feeType && !selectedCategoryId) {
      Alert.alert("Error", "Selecciona una categoría");
      return;
    }

    try {
      setSaving(true);

      await updateTransactionRecord({
        transactionId: transaction.id,
        nextValues: {
          type: transactionType,
          amount: numericAmount,
          description: description.trim(),
          date: localDateStringToTimestamp(selectedDate),
          accountId: selectedAccountId,
          destinationAccountId:
            transactionType === "transfer" ? destinationAccountId : null,
          categoryId: feeType ? null : selectedCategoryId,
          transferTarget:
            transactionType === "transfer" ? transferTarget : null,
          installmentsTotal: showInstallments ? (installmentsTotal ?? 1) : null,
          installmentsPaid: showInstallments ? (installmentsPaid ?? 0) : null,
          feeType: feeType,
        },
      });

      setEditing(false);
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !transaction) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Cargando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["bottom", "left", "right"]} // excluye top
    >
      <ScrollView className="flex-1 p-5">
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-blue-600">Cerrar</Text>
          </TouchableOpacity>

          <Text className="text-xl font-bold">
            {editing ? "Editar transacción" : "Detalle"}
          </Text>

          <TouchableOpacity onPress={() => setEditing((prev) => !prev)}>
            <Text className="text-blue-600">
              {editing ? "Cancelar" : "Editar"}
            </Text>
          </TouchableOpacity>
        </View>

        {!editing ? (
          <View className="gap-4">
            <View className="p-4 rounded-xl bg-gray-50">
              <Text className="text-xs text-gray-500">Tipo</Text>
              <Text className="text-base font-semibold text-black">
                {transaction.type}
              </Text>
            </View>

            <View className="p-4 rounded-xl bg-gray-50">
              <Text className="text-xs text-gray-500">Monto</Text>
              <Text className="text-base font-semibold text-black">
                ${Number(transaction.amount ?? 0).toLocaleString("es-CO")}
              </Text>
            </View>

            <View className="p-4 rounded-xl bg-gray-50">
              <Text className="text-xs text-gray-500">Descripción</Text>
              <Text className="text-base font-semibold text-black">
                {transaction.description || "Sin descripción"}
              </Text>
            </View>

            <View className="p-4 rounded-xl bg-gray-50">
              <Text className="text-xs text-gray-500">Fecha</Text>
              <Text className="text-base font-semibold text-black">{selectedDate}</Text>
            </View>

            <View className="pt-4">
              <TouchableOpacity
                className="bg-blue-600 py-4 rounded-lg items-center mb-3"
                onPress={() => setEditing(true)}
              >
                <Text className="text-black font-medium">Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-red-600 py-4 rounded-lg items-center"
                onPress={handleDelete}
              >
                <Text className="text-black font-medium">Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="gap-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Tipo
              </Text>
              <View className="flex-row gap-3">
                {(["income", "expense", "transfer"] as TxType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setTransactionType(type)}
                    className={`flex-1 p-3 border-2 rounded-lg items-center ${
                      transactionType === type
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <Text className="font-medium">{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Monto
              </Text>
              <TextInput
                className="px-4 py-3 border border-gray-300 rounded-lg"
                keyboardType="numeric"
                value={amountRaw}
                onChangeText={(text) => setAmountRaw(formatCOP(text))}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Descripción
              </Text>
              <TextInput
                className="px-4 py-3 border border-gray-300 rounded-lg"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Cuenta
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    onPress={() => setSelectedAccountId(account.id)}
                    className={`mr-2 px-4 py-3 rounded-xl border ${
                      selectedAccountId === account.id
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={
                        selectedAccountId === account.id
                          ? "text-black"
                          : "text-gray-900"
                      }
                    >
                      {account.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {transactionType !== "transfer" && !feeType && (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {filteredCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      className={`mr-2 px-4 py-3 rounded-xl border ${
                        selectedCategoryId === cat.id
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={
                          selectedCategoryId === cat.id
                            ? "text-black"
                            : "text-gray-900"
                        }
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {transactionType === "transfer" && (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Cuenta destino
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {accounts
                    .filter((acc) => acc.id !== selectedAccountId)
                    .map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        onPress={() => setDestinationAccountId(account.id)}
                        className={`mr-2 px-4 py-3 rounded-xl border ${
                          destinationAccountId === account.id
                            ? "bg-indigo-600 border-indigo-600"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Text
                          className={
                            destinationAccountId === account.id
                              ? "text-black"
                              : "text-gray-900"
                          }
                        >
                          {account.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}

            <View className="pt-4">
              <TouchableOpacity
                className={`py-4 rounded-lg items-center ${saving ? "bg-blue-300" : "bg-blue-600"}`}
                onPress={handleUpdate}
                disabled={saving}
              >
                <Text className="text-black font-medium">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
