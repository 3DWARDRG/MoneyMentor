// components/ImportVerificationModal.tsx
//
// Pantalla de VERIFICACIÓN de movimientos extraídos por OCR local.
// El usuario revisa, edita y confirma antes de que nada se guarde.
// Aquí nunca se muestra texto crudo del extracto sin redactar.

import { Dropdown } from "@/components/Dropdown";
import { useImportStore, formatDateText, parseDateText } from "@/store/useImportStore";
import { useFinanceCacheStore } from "@/store/useFinanceCacheStore";
import { parseMoney } from "@/services/ai/statementParser";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PremiumIcon from "@/components/ui/PremiumIcon";

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
  const scrollRef = useRef<ScrollView>(null);

  const {
    candidates,
    accounts,
    accountId,
    setAccountId,
    toggleCandidate,
    updateCandidate,
    addFromLine,
    addManual,
    confirm,
    cancel,
    saving,
    error,
    clearError,
    unparsedCount,
    pages,
    period,
    setPeriod,
  } = useImportStore();

  // Categorías desde el caché de finanzas (fuente única, observado en vivo).
  const categories = useFinanceCacheStore((s) => s.categories);
  const loadFinanceCache = useFinanceCacheStore((s) => s.load);

  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [showRaw, setShowRaw] = useState(false);
  const [categoryPickerFor, setCategoryPickerFor] = useState<string | null>(null);
  // Paginación: solo se renderiza la página/imagen actual (rendimiento).
  const [currentPage, setCurrentPage] = useState(1);
  // Edición del periodo del extracto (rango de fechas).
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [periodFromDraft, setPeriodFromDraft] = useState("");
  const [periodToDraft, setPeriodToDraft] = useState("");
  const [periodError, setPeriodError] = useState<string | null>(null);

  // Al abrir el modal (nueva sesión) se reinicia el panel de texto.
  useEffect(() => {
    if (visible) {
      setShowRaw(false);
      setAmountDrafts({});
      setCurrentPage(1);
      setEditingPeriod(false);
      setPeriodError(null);
      if (userId) loadFinanceCache(userId);
    }
  }, [visible, userId, loadFinanceCache]);

  const selectedCount = useMemo(() => candidates.filter((c) => c.selected).length, [candidates]);
  const selectedTotal = useMemo(
    () =>
      candidates
        .filter((c) => c.selected)
        .reduce((acc, c) => acc + Math.abs(c.amount ?? 0), 0),
    [candidates],
  );

  // Candidatos agrupados por página/imagen de origen, en orden de página.
  const groupedCandidates = useMemo(() => {
    const groups = new Map<number, (typeof candidates)[number][]>();
    for (const c of candidates) {
      const page = c.page ?? 1;
      const list = groups.get(page) ?? [];
      list.push(c);
      groups.set(page, list);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [candidates]);

  // Páginas con contenido (movimientos o líneas de texto), para la paginación.
  const pageNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const c of candidates) set.add(c.page ?? 1);
    for (const p of pages) set.add(p.page);
    return [...set].sort((a, b) => a - b);
  }, [candidates, pages]);

  // Página actual (si el contenido cambió, se mantiene dentro del rango).
  const safeCurrentPage = useMemo(() => {
    if (pageNumbers.includes(currentPage)) return currentPage;
    return pageNumbers[0] ?? 1;
  }, [currentPage, pageNumbers]);

  // Movimientos y líneas de la página/imagen actual.
  const currentPageCandidates = useMemo(
    () => groupedCandidates.find(([p]) => p === safeCurrentPage)?.[1] ?? [],
    [groupedCandidates, safeCurrentPage],
  );
  const currentPageLines = useMemo(
    () => pages.find((p) => p.page === safeCurrentPage)?.lines ?? [],
    [pages, safeCurrentPage],
  );

  // Al cambiar de página se vuelve arriba de la lista.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [safeCurrentPage]);

  // Movimientos cuya fecha queda fuera del periodo del extracto.
  const outOfRangeCount = useMemo(() => {
    if (!period) return 0;
    return candidates.filter(
      (c) => c.date !== null && (c.date < period.from || c.date > period.to),
    ).length;
  }, [candidates, period]);

  const startEditingPeriod = () => {
    setPeriodFromDraft(period ? formatDateText(period.from) : "");
    setPeriodToDraft(period ? formatDateText(period.to) : "");
    setPeriodError(null);
    setEditingPeriod(true);
  };

  const applyPeriod = async () => {
    const from = parseDateText(periodFromDraft);
    const to = parseDateText(periodToDraft);
    if (from === null || to === null) {
      setPeriodError("Formato de fecha inválido (dd/mm/aaaa).");
      return;
    }
    if (to < from) {
      setPeriodError("La fecha de fin debe ser posterior al inicio.");
      return;
    }
    await setPeriod(from, to);
    setEditingPeriod(false);
    setPeriodError(null);
  };

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

  // Líneas del texto ya redactado de una página/imagen, para agregar a mano.
  const renderPageLines = (page: { page: number; lines: string[] }) => (
    <View key={page.page}>
      {page.lines.map((line, index) => (
        <Pressable
          key={`${page.page}-${index}-${line}`}
          onPress={() => addFromLine(line)}
          className="mb-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-3 py-2.5"
        >
          <Text className="text-[13px] leading-snug text-ink dark:text-ink-dark">
            {line}
          </Text>
          <Text className="mt-0.5 text-[10px] font-medium text-accent dark:text-accent-dark">
            Tocar para agregar +
          </Text>
        </Pressable>
      ))}
    </View>
  );

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

        {/* Categoría */}
        <Pressable
          onPress={() => setCategoryPickerFor(c.id)}
          className="mt-2 flex-row items-center justify-between rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-3 py-2.5"
        >
          <Text
            className={`text-sm ${
              c.categoryId
                ? "text-ink dark:text-ink-dark"
                : "text-muted dark:text-muted-dark"
            }`}
          >
            {categories.find((cat) => cat.id === c.categoryId)?.name ??
              "Categoría"}
          </Text>
          <Text className="text-xs text-muted dark:text-muted-dark">▾</Text>
        </Pressable>
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
      <View
        className="flex-1 bg-panel dark:bg-panel-dark"
        style={{ paddingTop: insets.top }}
      >
        {/* Fondo plano: un SVG a pantalla completa dentro de un Modal nativo
            escala el bitmap a resolución de píxel y en Android revienta el
            límite de Canvas (trying to draw too large bitmap). */}
        <View className="absolute inset-0 bg-panel dark:bg-panel-dark" />

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

          {/* Periodo del extracto (rango de fechas) */}
          <View className="mt-3 rounded-xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-4 py-2.5">
            {editingPeriod ? (
              <View>
                <Text className="mb-1.5 text-[11px] font-medium text-muted dark:text-muted-dark">
                  Periodo del extracto (dd/mm/aaaa)
                </Text>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-3 py-2 text-sm text-ink dark:text-ink-dark"
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor="#9ca3af"
                    value={periodFromDraft}
                    onChangeText={setPeriodFromDraft}
                    keyboardType="numbers-and-punctuation"
                  />
                  <Text className="text-xs text-muted dark:text-muted-dark">a</Text>
                  <TextInput
                    className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-3 py-2 text-sm text-ink dark:text-ink-dark"
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor="#9ca3af"
                    value={periodToDraft}
                    onChangeText={setPeriodToDraft}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                {periodError ? (
                  <Text className="mt-1 text-[11px] leading-snug text-expense dark:text-expense-dark">
                    ⚠️ {periodError}
                  </Text>
                ) : null}
                <View className="mt-2 flex-row justify-end gap-2">
                  <Pressable
                    onPress={() => {
                      setEditingPeriod(false);
                      setPeriodError(null);
                    }}
                    className="rounded-lg border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-muted dark:text-muted-dark">
                      Cancelar
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={applyPeriod}
                    className="rounded-lg bg-accent dark:bg-accent-dark px-3 py-1.5"
                  >
                    <Text className="text-xs font-semibold text-white">Aplicar</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={startEditingPeriod}
                className="flex-row items-center justify-between"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-[11px] font-medium text-muted dark:text-muted-dark">
                    Periodo del extracto
                  </Text>
                  <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                    {period
                      ? `${formatDateText(period.from)} — ${formatDateText(period.to)}`
                      : "No detectado"}
                  </Text>
                  {outOfRangeCount > 0 ? (
                    <Text className="mt-0.5 text-[11px] leading-snug text-expense dark:text-expense-dark">
                      ⚠️ {outOfRangeCount} movimiento(s) con fecha fuera del
                      periodo.
                    </Text>
                  ) : null}
                </View>
                <Text className="text-xs font-semibold text-accent dark:text-accent-dark">
                  Editar
                </Text>
              </Pressable>
            )}
          </View>

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

        {/* Paginación: el usuario pasa de página en vez de renderizar todo */}
        {pageNumbers.length > 1 ? (
          <View className="mx-5 mb-2 mt-1 flex-row items-center justify-between">
            <Pressable
              onPress={() => setCurrentPage((p) => p - 1)}
              disabled={safeCurrentPage === pageNumbers[0]}
              className={`h-9 rounded-xl border border-black/10 dark:border-white/10 px-3 ${
                safeCurrentPage === pageNumbers[0]
                  ? "opacity-40"
                  : "bg-panel dark:bg-panel-dark"
              }`}
            >
              <Text className="text-xs font-semibold text-ink dark:text-ink-dark">
                ◀ Anterior
              </Text>
            </Pressable>
            <Text className="text-xs font-bold text-ink dark:text-ink-dark">
              Página {pageNumbers.indexOf(safeCurrentPage) + 1} de{" "}
              {pageNumbers.length}
            </Text>
            <Pressable
              onPress={() => setCurrentPage((p) => p + 1)}
              disabled={safeCurrentPage === pageNumbers[pageNumbers.length - 1]}
              className={`h-9 rounded-xl border border-black/10 dark:border-white/10 px-3 ${
                safeCurrentPage === pageNumbers[pageNumbers.length - 1]
                  ? "opacity-40"
                  : "bg-panel dark:bg-panel-dark"
              }`}
            >
              <Text className="text-xs font-semibold text-ink dark:text-ink-dark">
                Siguiente ▶
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Lista */}
        <ScrollView
          className="flex-1 px-5 pt-2"
          contentContainerStyle={{ paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
        >
          {candidates.length === 0 ? (
            <View className="mb-3 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3">
              <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                No se detectaron movimientos automáticamente
              </Text>
              <Text className="mt-1 text-xs leading-snug text-muted dark:text-muted-dark">
                El texto del extracto se leyó, pero no se reconocieron filas de
                movimientos. Toca las líneas de abajo que sí sean movimientos,
                o agrégalos manualmente.
              </Text>
              <Pressable
                onPress={() => addManual()}
                className="mt-3 h-11 items-center justify-center rounded-xl bg-accent dark:bg-accent-dark"
              >
                <Text className="text-sm font-semibold text-white">
                  ➕ Agregar movimiento manual
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mb-2 flex-row gap-2">
              <Pressable
                onPress={() => addManual()}
                className="h-10 flex-1 items-center justify-center rounded-xl border border-dashed border-black/20 dark:border-white/20"
              >
                <Text className="text-sm font-semibold text-muted dark:text-muted-dark">
                  ➕ Agregar manual
                </Text>
              </Pressable>
              {pages.length > 0 ? (
                <Pressable
                  onPress={() => setShowRaw((v) => !v)}
                  className="h-10 flex-1 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-3"
                >
                  <Text className="text-sm font-medium text-ink dark:text-ink-dark">
                    📄 Ver texto {showRaw ? "▲" : "▼"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Texto en bruto de la página actual (se muestra PRIMERO para que
              se vea y se copie de inmediato, sin quedar escondido debajo de
              los movimientos) */}
          {showRaw && currentPageLines.length > 0 ? (
            <View className="mb-4">
              <View className="mb-2 flex-row items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                <Text className="text-xs font-bold text-accent dark:text-accent-dark">
                  📄 Texto · Página {safeCurrentPage}
                </Text>
                <Text className="text-xs font-semibold text-ink dark:text-ink-dark">
                  {currentPageLines.length} línea(s)
                </Text>
              </View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="flex-1 pr-2 text-xs font-medium text-muted dark:text-muted-dark">
                  Toca una línea para agregarla como movimiento (o reconstruirla
                  si salió mal)
                </Text>
                <Pressable
                  onPress={() =>
                    Share.share({
                      message:
                        currentPageLines.join("\n") +
                        "\n\n(Texto ya redactado; copiado para diagnóstico.)",
                    })
                  }
                  className="rounded-lg border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-2 py-1"
                >
                  <Text className="text-[11px] font-medium text-ink dark:text-ink-dark">
                    Compartir texto
                  </Text>
                </Pressable>
              </View>
              {renderPageLines({ page: safeCurrentPage, lines: currentPageLines })}
            </View>
          ) : null}

          {/* Movimientos de la página actual */}
          {!showRaw && currentPageCandidates.length > 0 ? (
            <View className="mb-4">
              <View className="mb-2 flex-row items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                <Text className="text-xs font-bold text-accent dark:text-accent-dark">
                  📄 Página {safeCurrentPage}
                </Text>
                <Text className="text-xs font-semibold text-ink dark:text-ink-dark">
                  {currentPageCandidates.length} movimientos ·{" "}
                  {formatCOP(
                    currentPageCandidates
                      .filter((c) => c.selected)
                      .reduce((acc, c) => acc + Math.abs(c.amount ?? 0), 0),
                  )}{" "}
                  COP
                </Text>
              </View>
              {currentPageCandidates.map(renderRow)}
            </View>
          ) : null}

          {/* Líneas de la página actual cuando no se detectó nada */}
          {!showRaw &&
          currentPageLines.length > 0 &&
          currentPageCandidates.length === 0 ? (
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-medium text-muted dark:text-muted-dark">
                Líneas del extracto (toca las que son movimientos)
              </Text>
              {renderPageLines({ page: safeCurrentPage, lines: currentPageLines })}
            </View>
          ) : null}
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

      {/* Selector de categoría (bottom sheet) */}
      <Modal
        visible={!!categoryPickerFor}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerFor(null)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setCategoryPickerFor(null)}
        >
          <Pressable
            className="rounded-t-3xl border-t border-black/10 bg-panel dark:bg-panel-dark p-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            onPress={() => {}}
          >
            <Text className="text-lg font-bold text-ink dark:text-ink-dark">
              Categoría del movimiento
            </Text>
            {(() => {
              const target = candidates.find((c) => c.id === categoryPickerFor);
              if (!target) return null;
              const options = categories.filter(
                (cat) => cat.type === target.type,
              );
              return (
                <ScrollView
                  className="mt-3"
                  style={{ maxHeight: 380 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <Pressable
                    onPress={() => {
                      updateCandidate(target.id, { categoryId: null });
                      setCategoryPickerFor(null);
                    }}
                    className="rounded-xl px-3 py-3"
                  >
                    <Text className="text-sm text-muted dark:text-muted-dark">
                      Sin categoría
                    </Text>
                  </Pressable>
                  {options.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        updateCandidate(target.id, { categoryId: cat.id });
                        setCategoryPickerFor(null);
                      }}
                      className={`rounded-xl px-3 py-3 ${
                        target.categoryId === cat.id
                          ? "bg-accent/10 dark:bg-accent-dark/10"
                          : "bg-transparent"
                      }`}
                    >
                      <View className="flex-row items-center">
                        <PremiumIcon
                          token={cat.iconImage}
                          size={22}
                          radius={7}
                          fallback="📁"
                        />
                        <Text
                          className={`ml-2 text-sm ${
                            target.categoryId === cat.id
                              ? "font-semibold text-accent dark:text-accent-dark"
                              : "text-ink dark:text-ink-dark"
                          }`}
                        >
                          {cat.name}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
