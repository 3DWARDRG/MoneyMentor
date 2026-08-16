// components/ImportVerificationModal.tsx
//
// Pantalla de VERIFICACIÓN de movimientos extraídos por OCR local.
// El usuario revisa, edita y confirma antes de que nada se guarde.
// Aquí nunca se muestra texto crudo del extracto sin redactar.

import { Dropdown } from "@/components/Dropdown";
import { useImportStore } from "@/store/useImportStore";
import { parseMoney } from "@/services/ai/statementParser";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenBackdrop from "@/components/ui/ScreenBackdrop";

interface ImportVerificationModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onImported: (result: { count: number; total: number }) => void;
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);

export default function ImportVerificationModal({
  visible,
  userId,
  onClose,
  onImported,
}: ImportVerificationModalProps) {
  const insets = useSafeAreaInsets();

  const {
    candidates,
    accounts,
    accountId,
    setAccountId,
    toggleCandidate,
    updateCandidate,
    confirm,
    cancel,
    saving,
    error,
    clearError,
    unparsedCount,
  } = useImportStore();

  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});

  const selectedCount = useMemo(() => candidates.filter((c) => c.selected).length, [candidates]);
  const selectedTotal = useMemo(
    () =>
      candidates
        .filter((c) => c.selected)
        .reduce((acc, c) => acc + Math.abs(c.amount ?? 0), 0),
    [candidates],
  );

  const handleConfirm = async () => {
    if (!userId) return;
    const result = await confirm(userId);
    if (result) onImported(result);
  };

  const handleClose = () => {
    if (saving) return;
    cancel();
    onClose();
  };

  const renderRow = (c: (typeof candidates)[number]) => {
    const amountText = amountDrafts[c.id] ?? c.amountText;
    const parsed = parseMoney(amountText) ?? c.amount ?? 0;

    return (
      <View
        key={c.id}
        className="mb-3 rounded-2xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark p-3"
      >
        {/* Cabecera de fila: selección + tipo */}
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            onPress={() => toggleCandidate(c.id)}
            className="flex-row items-center"
          >
            <View
              className={`mr-2 h-6 w-6 items-center justify-center rounded-md border ${
                c.selected
                  ? "border-accent dark:border-accent-dark bg-accent dark:bg-accent-dark"
                  : "border-black/20 dark:border-white/20"
              }`}
            >
              {c.selected ? <Text className="text-xs font-bold text-white">✓</Text> : null}
            </View>
            <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
              Movimiento
            </Text>
          </Pressable>

          <View className="flex-row overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
            <Pressable
              onPress={() => updateCandidate(c.id, { type: "expense" })}
              className={`px-3 py-1.5 ${
                c.type === "expense"
                  ? "bg-expense"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  c.type === "expense" ? "text-white" : "text-muted dark:text-muted-dark"
                }`}
              >
                Gasto
              </Text>
            </Pressable>
            <Pressable
              onPress={() => updateCandidate(c.id, { type: "income" })}
              className={`px-3 py-1.5 ${
                c.type === "income"
                  ? "bg-income"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  c.type === "income" ? "text-white" : "text-muted dark:text-muted-dark"
                }`}
              >
                Ingreso
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Fecha y valor */}
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-3 py-2 text-sm text-ink dark:text-ink-dark"
            placeholder="dd/mm/aaaa"
            placeholderTextColor="#9ca3af"
            value={c.dateText}
            onChangeText={(dateText) => updateCandidate(c.id, { dateText })}
            keyboardType="numbers-and-punctuation"
          />
          <TextInput
            className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-3 py-2 text-sm text-ink dark:text-ink-dark"
            placeholder="0"
            placeholderTextColor="#9ca3af"
            value={amountText}
            onChangeText={(text) => {
              setAmountDrafts((d) => ({ ...d, [c.id]: text }));
            }}
            keyboardType="decimal-pad"
          />
        </View>
        {parsed > 0 && (
          <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
            {formatCOP(parsed)} COP
          </Text>
        )}

        {/* Descripción */}
        <TextInput
          className="mt-2 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-3 py-2 text-sm text-ink dark:text-ink-dark"
          placeholder="Descripción"
          placeholderTextColor="#9ca3af"
          value={c.description}
          onChangeText={(description) => updateCandidate(c.id, { description })}
          multiline
        />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <ScreenBackdrop />

        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink dark:text-ink-dark">
              Verificar movimientos
            </Text>
            <Text className="text-xs text-muted dark:text-muted-dark">
              Revisa, edita y confirma antes de guardar.
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            disabled={saving}
            className="rounded-full border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-4 py-2"
          >
            <Text className="text-sm font-medium text-ink dark:text-ink-dark">Cancelar</Text>
          </Pressable>
        </View>

        {error ? (
          <View className="mx-5 mb-2 flex-row items-center justify-between rounded-xl border border-expense/30 bg-expense/10 px-4 py-2">
            <Text className="flex-1 pr-2 text-xs text-expense dark:text-expense-dark">
              {error}
            </Text>
            <Pressable onPress={clearError}>
              <Text className="text-xs font-semibold text-expense dark:text-expense-dark">OK</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Cuenta destino */}
        <View className="px-5 pb-1">
          <Text className="mb-1 text-xs font-medium text-muted dark:text-muted-dark">
            Cuenta de destino
          </Text>
          <Dropdown
            options={accounts.map((a) => ({
              label: a.name,
              value: a.id,
            }))}
            value={accountId ?? ""}
            onSelect={setAccountId}
            placeholder="Selecciona una cuenta"
          />
          <View className="mt-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5">
            <Text className="text-[11px] leading-snug text-muted dark:text-muted-dark">
              🔒 Tu extracto se procesa en tu dispositivo. Los datos sensibles
              (números de cuenta, tarjetas, nombres) se redactan y nunca se
              envían a la IA.
            </Text>
            {unparsedCount > 0 ? (
              <Text className="mt-1.5 text-[11px] leading-snug text-expense dark:text-expense-dark">
                ⚠️ {unparsedCount} línea(s) no se pudieron interpretar. Puedes
                agregarlas manualmente después.
              </Text>
            ) : null}
          </View>
        </View>

        {/* Lista */}
        <ScrollView
          className="flex-1 px-5 pt-3"
          contentContainerStyle={{ paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {candidates.map(renderRow)}
        </ScrollView>

        {/* Footer */}
        <View
          className="border-t border-black/10 dark:border-white/10 px-5 py-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <Text className="mb-2 text-center text-xs text-muted dark:text-muted-dark">
            {selectedCount > 0
              ? `${selectedCount} movimientos · ${formatCOP(selectedTotal)} COP`
              : "Sin movimientos seleccionados"}
          </Text>
          <Pressable
            onPress={handleConfirm}
            disabled={saving || selectedCount === 0}
            className={`h-12 items-center justify-center rounded-xl ${
              saving || selectedCount === 0
                ? "bg-black/10 dark:bg-white/10"
                : "bg-accent dark:bg-accent-dark"
            }`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Confirmar y guardar
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
